const ACCESS_TOKEN_NAME = '_avidAccessToken';
const MCIP = '192.168.112.26';
const axios = require('axios');
const querystring = require('querystring');
const https = require('https');


module.exports = {
    getAccessToken: async function () {
        const url = `https://${MCIP}/auth/sso/login/oauth2/ad`;
        let data = querystring.stringify({
            'username': 'cloudadmin',
            'password': 'Avid.1234',
            'grant_type': 'password',
            'context_id': '00000000-0000-4000-a000-000000000000' 
        });

        return new Promise(async (resolve, reject) => {
            try {
                let response = await axios({
                    method: 'post',
                    url: url,
                    headers: {
                        'authorization': 'Basic Y29tLmF2aWQubWVkaWFjZW50cmFsY2xvdWQtYTk1YjNmOTM4NDk3NWE1MzVjZTAwNTMzMTUzMWY2ZmI6Yzg2M2JhNmM0ZTAzZDM1NWEzZDI5NjY0MWQ2NTY2ZWYzZTU0Y2ZiZTU1MzQ5NjliNWY3MmY1YmQ5NTZhNzE5MQ==',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                    },
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: false
                    }),
                    data: data
                })
                //console.log(response)                
                resolve(response.data.access_token);                                                     // return data back to calling method
            } catch(err) {
                reject(err);                                                                // returns error in case any
            }
        });
    },

    getRequestIP: async function (req) {
        return new Promise(async (resolve, reject) => {
            try {
                    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
                    if (ip.substr(0, 7) == "::ffff:") {
                        ip = ip.substr(7)
                    }                
                resolve(ip);                                                     // return data back to calling method
            } catch(err) {
                reject(err);                                                                // returns error in case any
            }
        });
    },

    getSessions: async function (token) {
        return new Promise(async (resolve, reject) => {
            try {
                    let config = {
                        method: 'get',
                        url: `https://${MCIP}/apis/avid.iam;realm=global;version=3/principals/group-users?include=tokens&_avidAccessToken=${token}`,
                        headers: { },
                        httpsAgent: new https.Agent({
                        rejectUnauthorized: false
                        }),
                    };

                    let sessions = {};
                    
                    axios(config)
                    .then((response) => {
                        for (let i = 0; i < response.data.entity.length; i++) {
                            let res = response.data.entity[i]

                            for (let j = 0; j < res.tokens.length; j++) {
                                //console.log(res.tokens[i].clientMachineId);
                                sessions[res.tokens[j].clientMachineId] = res.displayName;
                            }
                        }
                        resolve(sessions);                 
                    })
                    .catch((error) => {
                        console.log(error);
                    });

                                                                        
            } catch(err) {
                reject(err);                                                               
            }
        });
    },
}


