import { defineEventHandler, readBody, createError } from 'h3';
import jwt from 'jsonwebtoken';
import { useRuntimeConfig } from '#imports';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const config = useRuntimeConfig();
  const secret = config.public.onlyOfficeToken;
  
  if (!secret) {
    throw createError({ statusCode: 500, statusMessage: 'OnlyOffice secret not configured' });
  }

  // Generate JWT using jsonwebtoken
  const token = jwt.sign(body, secret, { expiresIn: '12h' });
  
  return { token };
});
