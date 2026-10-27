"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login, readAuthSession } from "../../../services/auth";
import { clearStoredAuthSession } from "../../../services/auth-session";
import { AuthShell } from "../../../components/auth-shell";

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/tabs/brand-control");
  const [isRouteReady, setIsRouteReady] = useState(false);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const next = new URLSearchParams(window.location.search).get("next");
      if (new URLSearchParams(window.location.search).get("account") === "new") clearStoredAuthSession();
      setNextPath(resolveNextPath(next));
    }
    setIsRouteReady(true);
  }, []);

  useEffect(() => {
    if (!isRouteReady) {
      return;
    }
    if (readAuthSession()?.accessToken) {
      router.replace(nextPath);
    }
  }, [isRouteReady, nextPath, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account.trim() || !password) {
      setErrorMessage("请输入账号和密码");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await login({
        account: account.trim(),
        password,
      });
      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      badge="统一账号入口"
      title="登录后直接回到你的增长工作台"
      description=""
      highlights={[
        { title: "统一身份", description: "同一个账号进入个人中心、品牌协作和内容工作台。" },
        { title: "目标回跳", description: "登录成功后自动回到你原本想进入的页面，不重新找入口。" },
        { title: "品牌隔离", description: "登录态和品牌上下文分层管理，减少多人协作时的串页风险。" },
      ]}
      footer={
        <div className="auth-footnote">
          还没有账号？<Link href={`/register?next=${encodeURIComponent(nextPath)}`}>去注册</Link>
        </div>
      }
    >
      <div className="panel-header">
        <div>
          <h1>欢迎回来</h1>
        </div>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>账号</span>
          <input
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            placeholder="手机号 / 邮箱 / 昵称"
            autoComplete="username"
          />
        </label>
        <label className="field">
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入密码"
            autoComplete="current-password"
          />
        </label>
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
        <button type="submit" className="primary-button auth-panel-submit" disabled={isSubmitting}>
          {isSubmitting ? "登录中..." : "登录并进入工作台"}
        </button>
      </form>
    </AuthShell>
  );
}

function resolveNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/tabs/brand-control";
  }
  return value;
}
