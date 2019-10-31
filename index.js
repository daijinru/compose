'use strict'

/**
 * Expose compositor.
 */

module.exports = compose

/**
 * Compose `middleware` returning
 * a fully valid middleware comprised
 * of all those which are passed.
 *
 * @param {Array} middleware
 * @return {Function}
 * @api public
 */

function compose (middleware) {
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }

  /**
   * @param {Object} context
   * @return {Promise}
   * @api public
   */

  return function (context, next) {
    // last called middleware #
    let index = -1

    // 开始递归操作 dispatch
    return dispatch(0)
    function dispatch (i) {
      // 此时若 i 小于 -1，则返回 Promise.reject(Error)
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))

      // 修改 index 和 i 值相等，准确获取每一个 middleware
      index = i

      // 取出 middleware 栈中的函数
      let fn = middleware[i]

      // 将最后一个中间件函数的 next 设定为当前 fn
      if (i === middleware.length) fn = next

      /**
       * 如果 !fn 说明此事 dispatch 的参数 i 拿不到实际的 middleware
       * 那么在最后一个 middleware 内执行 next() 返回 Promise.resolve()
       */
      if (!fn) return Promise.resolve()

      /**
       * fn 是 middleware[i]，传入 上下文 context（第一个参数），next 是下一函数
       * 这里用尾递归构建了 middlewares 的结构：
       * 大概是这样的 fn(context, fn(context, fn(context, fn(context))))
       * 如果其中一个中间件函数内部没有调用 next()，则其后的中间件不会执行
       * 如果它既没有调用 next()，并且在这之前没有调用 ctx.body，则返回 ctx.message 或者 string(ctx.status)
       * 每一个 next 函数都是 Promise 对象，所以提供 use(async fn()) 和内部 await next() 的写法
       */
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
