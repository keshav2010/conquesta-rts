import rateLimit from 'express-rate-limit';
import RedisStore, { RedisReply } from 'rate-limit-redis';
import redisClient from '../config/redisClient';

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  ipv6Subnet: 56,
  message: 'Too many requests, please try again later.',
  store: new RedisStore({
    sendCommand: (...args: [string, ...(string | number | Buffer)[]]): Promise<RedisReply> =>
      redisClient.call(...args) as Promise<RedisReply>,
  }),
});

export default limiter;
