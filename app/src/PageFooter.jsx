/**
 * 页脚：维护者与开源仓库链接（与 README 一致）
 */
export function PageFooter({ className = '' }) {
  return (
    <footer className={`text-center text-xs text-slate-500 ${className}`.trim()}>
      <a
        href="https://github.com/Yunikoi"
        target="_blank"
        rel="noreferrer"
        className="font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-500"
      >
        Yunikoi @ GitHub
      </a>
      <span className="mx-1.5 text-slate-300">·</span>
      <a
        href="https://github.com/Yunikoi/ShanbeiWordTest"
        target="_blank"
        rel="noreferrer"
        className="text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-500"
      >
        ShanbeiWordTest
      </a>
    </footer>
  )
}
