const crypto = require('crypto');

exports.handler = async (event) => {
  const META_PIXEL_ID = process.env.META_PIXEL_ID;
  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const META_TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE;

  if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Missing META envs'
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST', 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Method Not Allowed'
    };
  }

  let payload;
  try {
    payload = event.body && typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch (err) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Invalid JSON'
    };
  }

  // Expected fields
  const {
    event_id,
    value,
    currency,
    email,
    phone,
    fbp,
    fbc,
    content_ids,
    contents,
    event_source_url
  } = payload || {};

  // Normalize and hash helpers
  const sha256 = (str) => {
    return crypto.createHash('sha256').update(str).digest('hex');
  };

  const normalizeEmail = (e) => {
    if (!e) return undefined;
    return e.toString().trim().toLowerCase();
  };

  const normalizePhone = (p) => {
    if (!p) return undefined;
    const digits = p.toString().replace(/\D+/g, '');
    return digits || undefined;
  };

  const hashedEmail = email ? sha256(normalizeEmail(email)) : undefined;
  const hashedPhone = phone ? sha256(normalizePhone(phone)) : undefined;

  // client info from headers
  const headers = event.headers || {};
  const client_ip_address = headers['x-nf-client-connection-ip'] || headers['x-forwarded-for'] || headers['X-Forwarded-For'] || headers['x-nf-client-connection-ip'] || '';
  // If x-forwarded-for contains comma list, take first
  const client_ip = client_ip_address && client_ip_address.split ? client_ip_address.split(',')[0].trim() : client_ip_address;
  const client_user_agent = headers['user-agent'] || headers['User-Agent'] || '';

  const user_data = {};
  if (hashedEmail) user_data.em = hashedEmail;
  if (hashedPhone) user_data.ph = hashedPhone;
  if (fbp) user_data.fbp = fbp;
  if (fbc) user_data.fbc = fbc;
  if (client_ip) user_data.client_ip_address = client_ip;
  if (client_user_agent) user_data.client_user_agent = client_user_agent;

  const eventTime = Math.floor(Date.now() / 1000);

  const eventEntry = {
    event_name: 'Purchase',
    event_time: eventTime,
    event_id: event_id,
    event_source_url: event_source_url,
    action_source: 'website',
    user_data,
    custom_data: {
      value: value,
      currency: currency,
      content_ids: content_ids,
      contents: contents
    }
  };

  const body = {
    data: [eventEntry]
  };

  if (META_TEST_EVENT_CODE) {
    body.test_event_code = META_TEST_EVENT_CODE;
  }

  const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(META_PIXEL_ID)}/events?access_token=${encodeURIComponent(META_ACCESS_TOKEN)}`;

  try {
    // Use global fetch if available
    const fetchFn = (typeof fetch === 'function') ? fetch : null;
    if (!fetchFn) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: 'Fetch not available in runtime'
      };
    }

    const resp = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const text = await resp.text();

    return {
      statusCode: resp.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: text
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Error sending to Graph: ' + (err && err.message ? err.message : String(err))
    };
  }
};
