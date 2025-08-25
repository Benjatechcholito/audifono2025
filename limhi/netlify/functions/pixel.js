exports.handler = async (event, context) => {
  const PIXEL_ID = process.env.META_PIXEL_ID;
  const headers = {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=300'
  };

  if (!PIXEL_ID) {
    return {
      statusCode: 500,
      headers,
      body: '/* META_PIXEL_ID missing */'
    };
  }

  const body = `(function(){
  // Load Facebook Pixel runtime
  var s = document.createElement('script');
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  s.async = true;
  s.onload = function(){
    try{
      if (typeof fbq === 'function'){
        fbq('init','${PIXEL_ID}');
        fbq('track','PageView');
      } else if (window.fbq && typeof window.fbq === 'function'){
        window.fbq('init','${PIXEL_ID}');
        window.fbq('track','PageView');
      }
    }catch(e){/* ignore */}
  };
  document.head.appendChild(s);
})();`;

  return {
    statusCode: 200,
    headers,
    body
  };
};
