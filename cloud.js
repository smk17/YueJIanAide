const AV = require('leanengine');
const https = require('https');
const requestjson = require('request-json');

/**
 * 一个简单的云代码方法

 AV.Cloud.define('hello', function(request) {
  var token = AV.Object.createWithoutData('Global', '5957121e128fe100582b6461');
  token.set('value', 'hello');
  token.save();
  return 'Hello world!';
});
 */

AV.Cloud.define('remindYueJian', function(request) {
  var date = new Date();
  date.setMinutes(date.getMinutes() + 5);
  var query = new AV.Query('Participate');
  query.lessThan('date', date);//<
  query.equalTo('isSend', false);
  query.include('user');
  query.include('yuejian');
  query.find().then(function (results) {
    results.forEach(function (participate, index, array){
      try {
        let remind = parseInt(participate.get('remind').name);
        if (remind > 0) {
          let user = participate.get('user');
          let yuejian = participate.get('yuejian');
          let date = yuejian.get('date');
          let datestr = date.getFullYear() + '年' + ("00" + (date.getMonth() + 1)).substr(-2) + '月' + ("00" + date.getDate()).substr(-2) + '日  ' + ("00" + date.getHours()).substr(-2) + ':' + ("00" + date.getMinutes()).substr(-2); 
          var contents = {
            "touser": user.get('authData').lc_weapp.openid,  
            "template_id": 'g7eqRz3t3xaeUUUqo_Kai6_bSbmK_CASdL7nABQGiaM',         
            "form_id": participate.get('formId'),
            "page": 'pages/detail/detail?id=' + yuejian.id,
            "data": {
              "keyword1": {//主题
                "value": yuejian.get('title'),
                "color": "#173177"
              },
              "keyword2": {//时间
                "value": datestr,
                "color": "#173177"
              },
              "keyword3": {//地点
                "value": yuejian.get('location').name,
                "color": "#173177"
              }
            }
          };
          var token = AV.Object.createWithoutData('Global', '596da53b570c35005b4db2fd');
          token.fetch().then(function(){
            var value = JSON.parse(token.get('value'))
            var url = "/cgi-bin/message/wxopen/template/send?access_token=";
            url += value.access_token;
            var client = requestjson.createClient('https://api.weixin.qq.com');
        
            client.post(url, contents, function(err, res, body) {
              console.log(res.statusCode,body);
              if (res.statusCode == 200 && body.errcode == 0) {
                participate.set('isSend', true);
                participate.save().then(function (todo) {
                  console.log('objectId is ' + todo.id);
                }, function (error) {
                  console.error(error);
                });
              }
            });
          }, function (error) {
            console.error(error.message);
            return error.message;
          });
        };
      } catch (e) {
        console.error(e.message);
        return e.message;
      }
      
    });
  }, function (error) {
    console.error(error.message);
    return error.message;
  });
});

AV.Cloud.define('getAccessToken', function(request) {
  var url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid="+process.env.APPID+"&secret="+process.env.APPSECRET;
  https.get(url, (res) => {
    const { statusCode } = res;
    const contentType = res.headers['content-type'];

    let error;
    if (statusCode !== 200) {
      error = new Error('请求失败。\n' +
        '状态码: ${statusCode}');
    } else if (!/^application\/json/.test(contentType)) {
      error = new Error('无效的 content-type.\n' +
        '期望 application/json 但获取的是 ${contentType}');
    }
    if (error) {
      console.error(error.message);
      // 消耗响应数据以释放内存
      res.resume();
      return;
    }
  
    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(rawData);
        console.log(parsedData);
        var token = AV.Object.createWithoutData('Global', '596da53b570c35005b4db2fd');
        token.fetch().then(function(){
          token.set('value', rawData);
          token.save();
        }, function (e) {
          console.error(e.message);
        });
        } catch (e) {
          console.error(e.message);
        }
    });
  }).on('error', (e) => {
    console.error(`错误: ${e.message}`);
  });
})
