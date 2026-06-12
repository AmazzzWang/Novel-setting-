// 本地运行时,用 localStorage 顶替 Claude 画布环境里的 window.storage。
// 接口与组件里用到的 get/set 保持一致(get 命中返回 {key,value},未命中返回 null)。
window.storage = {
  async get(key) {
    const v = localStorage.getItem(key);
    return v == null ? null : { key, value: v };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { key, deleted: true };
  },
  async list(prefix = "") {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
    return { keys, prefix };
  },
};
