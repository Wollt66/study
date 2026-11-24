<script setup lang="ts">
/**
 * 登录页（Element Plus）。
 * - 提交调用 `POST /api/auth/login`，失败展示统一中文错误文案（含锁定提示）
 * - 登录成功后回跳 `?redirect=` 指定的后台页面，缺省 `/admin/dashboard`
 */
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElAlert, ElButton, ElForm, ElFormItem, ElInput, ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const form = reactive({ username: 'admin', password: '' })

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

/** 回跳地址仅接受站内绝对路径，防止开放重定向 */
const redirectTarget = computed(() => {
  const raw = route.query.redirect
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value
  }
  return '/admin/dashboard'
})

async function onSubmit(): Promise<void> {
  if (submitting.value) return
  const instance = formRef.value
  if (!instance) return
  const valid = await instance.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  const ok = await auth.login(form.username, form.password)
  submitting.value = false
  if (!ok) return

  ElMessage.success('登录成功')
  await router.replace(redirectTarget.value)
}
</script>

<template>
  <div class="login-page">
    <div class="login-page__grid" aria-hidden="true"></div>
    <div class="login-page__glow" aria-hidden="true"></div>

    <section class="login-card">
      <header class="login-card__head">
        <p class="login-card__eyebrow">TRAFFIC MONITORING · ADMIN</p>
        <h1 class="login-card__title">城市交通监控管理后台</h1>
        <p class="login-card__sub">登录后可查看看板概览、管理区域与路口数据</p>
      </header>

      <ElAlert
        v-if="auth.error"
        class="login-card__alert"
        :title="auth.error"
        type="error"
        :closable="false"
        show-icon
      />

      <ElForm
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        size="large"
        @keyup.enter="onSubmit"
      >
        <ElFormItem label="用户名" prop="username">
          <ElInput
            v-model="form.username"
            placeholder="请输入用户名"
            :prefix-icon="User"
            autocomplete="username"
            clearable
          />
        </ElFormItem>
        <ElFormItem label="密码" prop="password">
          <ElInput
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            autocomplete="current-password"
            show-password
          />
        </ElFormItem>
        <ElButton
          class="login-card__submit"
          type="primary"
          :loading="submitting"
          native-type="button"
          @click="onSubmit"
        >
          登录
        </ElButton>
      </ElForm>

      <footer class="login-card__foot">
        <RouterLink class="login-card__link" to="/">← 返回大屏</RouterLink>
        <span class="login-card__hint">
          默认账号由后端 ADMIN_INIT_USERNAME / ADMIN_INIT_PASSWORD 配置
        </span>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px 16px;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 22%, rgba(0, 240, 255, 0.16), transparent 42%),
    radial-gradient(circle at 82% 78%, rgba(255, 45, 149, 0.16), transparent 45%),
    var(--bg-deep, #050816);
  font-family: var(--font-body, 'PingFang SC', 'Microsoft YaHei', sans-serif);
}

.login-page__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 240, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 240, 255, 0.06) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at 50% 45%, rgba(0, 0, 0, 0.95), transparent 78%);
  pointer-events: none;
}

.login-page__glow {
  position: absolute;
  width: 620px;
  height: 620px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 240, 255, 0.14), transparent 62%);
  filter: blur(12px);
  pointer-events: none;
}

.login-card {
  position: relative;
  z-index: 1;
  width: min(420px, 100%);
  padding: 36px 32px 28px;
  border-radius: 18px;
  border: 1px solid var(--border-neon, rgba(0, 240, 255, 0.35));
  background:
    linear-gradient(160deg, rgba(0, 240, 255, 0.08), transparent 42%, rgba(255, 45, 149, 0.08)),
    rgba(13, 20, 46, 0.86);
  box-shadow:
    0 0 28px rgba(0, 240, 255, 0.16),
    inset 0 0 28px rgba(0, 240, 255, 0.05);
  backdrop-filter: blur(10px);
}

.login-card__head {
  margin-bottom: 20px;
}

.login-card__eyebrow {
  margin: 0 0 8px;
  color: var(--neon-cyan, #00f0ff);
  font-family: var(--font-mono, 'Share Tech Mono', monospace);
  font-size: 12px;
  letter-spacing: 0.24em;
  opacity: 0.85;
}

.login-card__title {
  margin: 0;
  color: var(--text-primary, #e8f0ff);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.login-card__sub {
  margin: 8px 0 0;
  color: var(--text-muted, #9aa7c7);
  font-size: 13px;
  line-height: 1.5;
}

.login-card__alert {
  margin-bottom: 16px;
}

.login-card__submit {
  width: 100%;
  margin-top: 6px;
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.login-card__foot {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid rgba(0, 240, 255, 0.14);
  font-size: 12px;
}

.login-card__link {
  color: var(--neon-cyan, #00f0ff);
  text-decoration: none;
}

.login-card__link:hover {
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.6);
}

.login-card__hint {
  color: var(--text-muted, #9aa7c7);
  line-height: 1.5;
}
</style>