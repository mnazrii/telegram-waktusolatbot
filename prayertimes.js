var request = require('request');

export async function getBody(url) {
    var options = {
        'method': 'GET',
        'url': 'https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=year&zone=WLY01',
        'headers': {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
        
      };
  
    // Return new promise
    return new Promise(function(resolve, reject) {
      // Do async job
      request.get(options, function(err, resp, body) {
        if (err) {
          reject(err);
        } else {
          resolve(body);
        }
      })
    })
}