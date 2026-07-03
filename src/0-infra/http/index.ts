/** 基础设施层 — Axios HTTP 实例 */

import axios from "axios";
import { API_BASE_URL } from "@infra/config";

/** 开发环境通过 Vite 代理请求，生产环境直连 */
const baseURL = import.meta.env.DEV ? "/api/quicktiny" : API_BASE_URL;

const http = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// 响应拦截：统一日志，统一错误处理
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const msg = error.response.data?.message ?? "请求失败";
      console.error(`[HTTP ${error.response.status}]`, msg);
    } else if (error.request) {
      console.error("[HTTP] 网络异常，请检查连接");
    }
    return Promise.reject(error);
  }
);

export default http;
