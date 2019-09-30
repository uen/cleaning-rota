let environment = {};
try {environment = require('./config')} catch(e){}

const env = Object.assign({
    APP_NAME : "cleaning-rota",
    DOCUMENT_KEY : "1xc1WC8U8Ke-Stnv6vJsqZPqsvV9sNRh39V8Qs5NktIU",
    PROCESS_TIME : 10 * 1000,
    FB_USERNAME : "",
    FB_PASSWORD : "",
    CHAT_ID : "",
    GOOGLE_CREDENTIALS : {
        "type": "",
        "project_id": "",
        "private_key_id": "",
        "private_key": "",
        "client_email": "",
        "client_id": "",
        "auth_uri": "",
        "token_uri": "",
        "auth_provider_x509_cert_url": "",
        "client_x509_cert_url": ""
      }
}, environment);

Object.keys(env).forEach((k) => {
	if(!process.env.hasOwnProperty(k)){
		process.env[k] = env[k]
    }
});

module.exports = env;

