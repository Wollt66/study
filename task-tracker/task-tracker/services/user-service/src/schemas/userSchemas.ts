import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, '用户名长度需≥3')
    .max(30, '用户名长度需≤30')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名仅含字母、数字、下划线'),
  email: z.string().email('邮箱格式不正确'),
  password: z
    .string()
    .min(8, '密码长度需≥8')
    .refine((p) => /[a-zA-Z]/.test(p), '密码需包含字母')
    .refine((p) => /\d/.test(p), '密码需包含数字'),
});

export const loginSchema = z.object({
  account: z.string().min(1, '账号不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

export const updateProfileSchema = z
  .object({
    email: z.string().email('邮箱格式不正确').optional(),
    nickname: z.string().max(50).optional(),
  })
  .strict(); // strict 模式会拒绝 password 等多余字段
