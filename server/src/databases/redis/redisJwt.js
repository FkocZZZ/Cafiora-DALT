const redis = require('redis');

const client = redis.createClient({
    url: process.env.REDIS_CONNECT_URL
});
const connectRedis = async () => {
    client.on('error', (err) => console.error('Redis Client Error', err));

    client.connect().then(async () => {
        console.log('Kết nối đến Cloud Redis thành công!');
    }).catch((err) => {
        console.error('Lỗi kết nối:', err);
    });
}


const pushTokenToBlackList = async (key, token, expireTime) => {
    await client.LPUSH(key, token);
    await client.expire(key, expireTime);
}
const isHaveTokenInBlackList = async (key, token) => {
    const list = await client.LRANGE(key, 0, -1);
    const isHave = list.includes(token)
    return isHave;
}

module.exports = { connectRedis, pushTokenToBlackList, isHaveTokenInBlackList }