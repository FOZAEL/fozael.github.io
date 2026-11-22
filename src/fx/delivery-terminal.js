// Interactive Windows Terminal Git-to-Prod CI/CD Simulator for #delivery:
// - Pre-written PowerShell + Git workflow (git status -> git add . -> git commit -> ready for git push).
// - Typed or button-triggered `git push` streams authentic remote push output, then transitions
//   smoothly into the live Pipeline Terminal view with animated Rive DAG flow and an Nx-style
//   two-column Tasks + Command Output panel.
// - Builds all output DOM nodes via createElement + textContent (never innerHTML with user input).

const STAGE_DURS = [900, 1600, 1400, 1500, 2000, 1250]
const STAGE_COLORS = [
  '#f2ede4', // 1: COMMIT
  '#3b8ef3', // 2: IAC
  '#e8a238', // 3: GATE
  '#f48556', // 4: BUILD
  '#3b8ef3', // 5: CANARY / CLUSTER
  '#4ee0b0', // 6: SLO / MONITOR
]
const SPIN_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

const randHex = (len) => {
  let s = ''
  for (let i = 0; i < len; i++) s += ((Math.random() * 16) | 0).toString(16)
  return s
}

const bumpVersion = (ver, msg) => {
  const parts = String(ver).split('.').map((n) => Number(n) || 0)
  const maj = parts[0] ?? 1
  const min = parts[1] ?? 0
  const pat = parts[2] ?? 0
  if (/^feat\b/i.test(msg.trim())) return `${maj}.${min + 1}.0`
  return `${maj}.${min}.${pat + 1}`
}

const formatSec = (ms) => `${(Math.max(0, ms) / 1000).toFixed(1)}s`

const formatClock = (ms) => {
  const sec = Math.max(0, ms / 1000)
  const m = Math.floor(sec / 60)
  const rem = (sec % 60).toFixed(1).padStart(4, '0')
  return `${String(m).padStart(2, '0')}:${rem}`
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

export const initDeliveryTerminal = ({ presets, getBoard, toast, onRunningChange }) => {
  const wtWindow = document.getElementById('wt-delivery')
  const wtViewGit = document.getElementById('wt-view-git')
  const termBody = document.getElementById('term-body')
  const termOut = document.getElementById('term-out')
  const termPrompt = document.getElementById('term-prompt')
  const termInputLine = document.getElementById('term-input-line')
  const termTyped = document.getElementById('term-typed')
  const termInput = document.getElementById('term-input')
  const btnTermReset = document.getElementById('btn-term-reset')
  const btnWtClose = document.getElementById('btn-wt-close')
  const btnBackGit = document.getElementById('btn-back-git')

  const runTitle = document.getElementById('run-title')
  const runElapsed = document.getElementById('run-elapsed')
  const runStatus = document.getElementById('run-status')
  const runLog = document.getElementById('run-log')
  const nxTaskCount = document.getElementById('nx-task-count')
  const nxTaskList = document.getElementById('nx-task-list')
  const nxOutTitle = document.getElementById('nx-out-title')
  const btnNxAll = document.getElementById('btn-nx-all')
  const btnNxInspect = document.getElementById('btn-nx-inspect')

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let activeIdx = 0
  let preset = presets[0]
  let running = false
  let busy = false
  let presetToken = 0
  let activeRunToken = 0
  let resetTimer = null
  let regenTimer = null
  let uiTickTimer = null
  let autoPushTimer = null
  let hasAutoPlayed = false
  let spinTick = 0

  const cmdHistory = []
  let histIdx = 0
  let state = null

  // Nx runner state
  let stageStates = []
  let allLogs = []
  let selectedStage = 0 // 0 = all stages stream, 1..6 = pinned stage
  let lastRunCtx = null
  let runStartMs = 0

  const setView = (view) => {
    if (!wtWindow) return
    wtWindow.dataset.view = view
  }

  const setBusy = (val) => {
    busy = val
    if (termInput) termInput.readOnly = val
  }

  const trimChildren = (el, max) => {
    if (!el) return
    while (el.childElementCount > max && el.firstElementChild) {
      el.firstElementChild.remove()
    }
  }

  const appendTermLine = (text, cls = '') => {
    if (!termOut) return
    const div = document.createElement('div')
    div.className = cls ? `sc-line ${cls}` : 'sc-line'
    div.textContent = text
    termOut.appendChild(div)
    trimChildren(termOut, 200)
    if (termBody) termBody.scrollTop = termBody.scrollHeight
  }

  const fillPrompt = (el, p, aheadCount = state?.ahead?.length || 0) => {
    el.textContent = ''
    const ps = document.createElement('span')
    ps.className = 'sc-p-user'
    ps.textContent = 'PS '
    const path = document.createElement('span')
    path.className = 'sc-p-path'
    path.textContent = `C:\\dev\\${p.repo}`
    const sp = document.createTextNode(' ')
    const br = document.createElement('span')
    br.className = 'sc-p-branch'
    br.textContent = aheadCount > 0 ? `[main ↑${aheadCount}]>` : '(main)>'
    el.append(ps, path, sp, br)
  }

  const echoPromptCommand = (cmd, aheadOverride = null) => {
    if (!termOut) return
    const row = document.createElement('div')
    row.className = 'sc-line'
    const pSpan = document.createElement('span')
    pSpan.className = 'sc-prompt'
    fillPrompt(pSpan, preset, aheadOverride === null ? (state?.ahead?.length || 0) : aheadOverride)
    const cSpan = document.createElement('span')
    cSpan.className = 'sc-cmd'
    cSpan.textContent = ` ${cmd}`
    row.append(pSpan, cSpan)
    termOut.appendChild(row)
    trimChildren(termOut, 200)
    if (termBody) termBody.scrollTop = termBody.scrollHeight
  }

  const updateHeaderMeta = () => {
    if (termPrompt) fillPrompt(termPrompt, preset)
  }

  const printGitStatus = () => {
    appendTermLine('On branch main')
    if (state.ahead.length) {
      const n = state.ahead.length
      appendTermLine(`Your branch is ahead of 'origin/main' by ${n} commit${n > 1 ? 's' : ''}.`)
      appendTermLine('  (use "git push" to publish your local commits)', 'sc-dim')
    }
    if (state.staged.length) {
      appendTermLine('Changes to be committed:')
      for (const f of state.staged) {
        appendTermLine(`        modified:   ${f.path} (+${f.add} -${f.del})`, 'sc-add')
      }
    }
    if (state.modified.length) {
      appendTermLine('Changes not staged for commit:')
      for (const f of state.modified) {
        appendTermLine(`        modified:   ${f.path} (+${f.add} -${f.del})`, 'sc-del')
      }
    }
    if (!state.staged.length && !state.modified.length && !state.ahead.length) {
      appendTermLine('nothing to commit, working tree clean', 'sc-dim')
    }
  }

  // Nx Two-Column Task + Log Rendering --------------------------------------
  const makeLogNode = (entry) => {
    const row = document.createElement('div')
    if (entry.kind === 'header') {
      row.className = 'sc-line sc-stage-head'
      row.textContent = `> ${entry.stageName.toLowerCase()}`
      return row
    }
    if (entry.kind === 'summary') {
      row.className = `sc-line sc-stage-head ${entry.ok ? 'sc-ok' : 'sc-err'}`
      row.textContent = entry.text
      return row
    }
    if (entry.kind === 'inspect') {
      row.className = entry.k === 'ok' ? 'sc-line sc-ok' : 'sc-line sc-dim'
      row.textContent = entry.text
      return row
    }

    row.className = 'sc-line'
    const ts = document.createElement('span')
    ts.className = 'sc-ts'
    ts.textContent = `[${entry.ts}]`

    const tag = document.createElement('span')
    tag.className = 'sc-tag'
    tag.style.color = STAGE_COLORS[entry.stageIdx - 1] || '#a4a9b6'
    tag.textContent = entry.stageName.padEnd(10, ' ')

    const txt = document.createElement('span')
    if (entry.k === 'ok') {
      txt.className = 'sc-ok'
      txt.textContent = `✓ ${entry.text}`
    } else if (entry.k === 'cmd') {
      txt.className = 'sc-cmd'
      txt.textContent = entry.text
    } else if (entry.k === 'err') {
      txt.className = 'sc-err'
      txt.textContent = `✖ ${entry.text}`
    } else {
      txt.className = 'sc-dim'
      txt.textContent = entry.text
    }

    row.append(ts, tag, txt)
    return row
  }

  const syncNxHeader = () => {
    if (btnNxAll) btnNxAll.setAttribute('aria-pressed', String(selectedStage === 0))
    if (nxOutTitle) {
      if (selectedStage === 0) {
        nxOutTitle.textContent = 'STREAM · ALL STAGES'
      } else {
        const st = stageStates[selectedStage - 1]
        nxOutTitle.textContent = `STAGE 0${selectedStage} · ${st ? st.name : ''}`
      }
    }
  }

  const renderNxLogs = () => {
    if (!runLog) return
    runLog.textContent = ''
    const list = selectedStage === 0
      ? allLogs
      : (stageStates[selectedStage - 1]?.logs || [])

    if (!list.length) {
      const hint = document.createElement('div')
      hint.className = 'sc-line sc-dim'
      hint.textContent = selectedStage === 0
        ? 'Waiting for pipeline tasks...'
        : 'Stage queued — waiting for upstream tasks...'
      runLog.appendChild(hint)
      return
    }
    for (const entry of list) {
      runLog.appendChild(makeLogNode(entry))
    }
    trimChildren(runLog, 300)
    runLog.scrollTop = runLog.scrollHeight
  }

  const appendNxLog = (entry) => {
    allLogs.push(entry)
    if (entry.stageIdx >= 1 && stageStates[entry.stageIdx - 1]) {
      stageStates[entry.stageIdx - 1].logs.push(entry)
    }
    const shouldAppend = selectedStage === 0 || entry.stageIdx === selectedStage
    if (!shouldAppend || !runLog) return
    if (runLog.firstElementChild?.textContent?.startsWith('Stage queued') ||
        runLog.firstElementChild?.textContent?.startsWith('Waiting for pipeline')) {
      runLog.textContent = ''
    }
    runLog.appendChild(makeLogNode(entry))
    trimChildren(runLog, 300)
    runLog.scrollTop = runLog.scrollHeight
  }

  const renderNxTasks = () => {
    if (!nxTaskList) return
    const now = performance.now()
    let completed = 0

    if (nxTaskList.childElementCount !== stageStates.length) {
      nxTaskList.textContent = ''
      stageStates.forEach((st, i) => {
        const li = document.createElement('li')
        li.className = 'nx-task wt-reveal-item'
        li.dataset.stage = String(i + 1)
        li.style.setProperty('--reveal-delay', `${280 + i * 65}ms`)

        const glyph = document.createElement('span')
        glyph.className = 'nx-glyph'
        glyph.setAttribute('aria-hidden', 'true')

        const name = document.createElement('span')
        name.className = 'nx-name'
        name.textContent = st.name

        const dur = document.createElement('span')
        dur.className = 'nx-dur'

        li.append(glyph, name, dur)
        li.addEventListener('click', () => {
          selectedStage = i + 1
          syncNxHeader()
          renderNxTasks()
          renderNxLogs()
        })
        nxTaskList.appendChild(li)
      })
    }

    const rows = [...nxTaskList.children]
    stageStates.forEach((st, i) => {
      const li = rows[i]
      if (!li) return
      li.dataset.status = st.status
      li.classList.toggle('is-selected', selectedStage === i + 1)

      const glyph = li.children[0]
      const nameEl = li.children[1]
      const dur = li.children[2]
      if (nameEl && nameEl.textContent !== st.name) nameEl.textContent = st.name
      if (st.status === 'passed') {
        completed += 1
        glyph.textContent = '✓'
        dur.textContent = formatSec(st.durMs)
      } else if (st.status === 'failed') {
        glyph.textContent = '✖'
        dur.textContent = formatSec(st.durMs)
      } else if (st.status === 'running') {
        glyph.textContent = SPIN_FRAMES[(spinTick + i) % SPIN_FRAMES.length]
        dur.textContent = formatSec(now - st.startedAt)
      } else {
        glyph.textContent = '○'
        dur.textContent = '—'
      }
    })

    if (nxTaskCount) nxTaskCount.textContent = `${completed}/${stageStates.length}`
    if (runElapsed && running) runElapsed.textContent = formatClock(now - runStartMs)
  }

  const initNxRunner = (p) => {
    clearInterval(uiTickTimer)
    stageStates = p.stages.map((name) => ({
      name,
      status: 'queued',
      startedAt: 0,
      durMs: 0,
      logs: [],
    }))
    allLogs = []
    selectedStage = 0
    lastRunCtx = null
    if (btnNxInspect) {
      btnNxInspect.hidden = true
      btnNxInspect.textContent = `$ ${p.inspectCmd}`
    }
    if (runElapsed) runElapsed.textContent = '00:00.0'
    if (runTitle) runTitle.textContent = `Run #${state?.runNo ?? p.runStart} · ${p.ci}`
    if (runStatus) {
      runStatus.dataset.state = 'idle'
      runStatus.textContent = 'idle'
    }
    syncNxHeader()
    renderNxTasks()
    renderNxLogs()
  }

  const resetToPrewrittenGit = () => {
    const p = preset
    const initHash = randHex(7)
    const filesCount = p.files.length
    const sumAdd = p.files.reduce((a, f) => a + f.add, 0)
    const sumDel = p.files.reduce((a, f) => a + f.del, 0)

    state = {
      modified: [],
      staged: [],
      ahead: [{ hash: initHash, msg: p.sampleMessage }],
      history: [...p.history],
      version: p.version,
      runNo: p.runStart,
      deployedAt: null,
      podHash: randHex(5),
    }

    wtViewGit?.classList.remove('is-sand-blowing')
    termInputLine?.classList.remove('is-autotyping')
    if (termTyped) termTyped.textContent = ''
    if (termInput) termInput.value = ''

    updateHeaderMeta()
    if (termOut) termOut.textContent = ''
    appendTermLine(`Windows PowerShell · ${p.context} (${p.env})`, 'sc-dim')
    echoPromptCommand('git status', 0)
    appendTermLine('On branch main')
    appendTermLine('Changes not staged for commit:')
    for (const f of p.files) {
      appendTermLine(`        modified:   ${f.path} (+${f.add} -${f.del})`, 'sc-del')
    }
    echoPromptCommand('git add .', 0)
    echoPromptCommand(`git commit -m "${p.sampleMessage}"`, 0)
    appendTermLine(`[main ${initHash}] ${p.sampleMessage}`)
    appendTermLine(` ${filesCount} file${filesCount > 1 ? 's' : ''} changed, ${sumAdd} insertions(+), ${sumDel} deletions(-)`)
  }

  let triggerPushSequence = async () => {}

  const setPreset = (idx, opts = {}) => {
    clearTimeout(autoPushTimer)
    clearTimeout(resetTimer)
    clearTimeout(regenTimer)
    clearInterval(uiTickTimer)
    presetToken += 1
    activeRunToken += 1

    if (running) {
      running = false
      onRunningChange?.(false)
    }

    activeIdx = Math.max(0, Math.min(presets.length - 1, idx))
    preset = presets[activeIdx]

    if (wtWindow) {
      wtWindow.dataset.preset = String(activeIdx)
      wtWindow.dataset.view = 'git'
    }

    const b = getBoard()
    if (b) {
      b.set('runMode', 0, true)
      b.set('doneMask', 0, true)
      b.set('boost', 0, true)
      for (let i = 1; i <= 6; i++) b.set(`st${i}`, 0.2, true)
    }

    setBusy(false)
    resetToPrewrittenGit()
    initNxRunner(preset)

    if (opts.autoRun) {
      hasAutoPlayed = true
      const token = presetToken
      autoPushTimer = setTimeout(() => {
        if (presetToken !== token) return
        triggerPushSequence(false)
      }, reducedMotion ? 30 : 500)
    }
  }

  const formatLineTemplate = (tmpl, ctx) =>
    tmpl
      .replaceAll('{hash}', ctx.hash)
      .replaceAll('{version}', ctx.version)
      .replaceAll('{digest}', ctx.digest)
      .replaceAll('{run}', String(ctx.runNo))
      .replaceAll('{env}', ctx.env)
      .replaceAll('{podhash}', ctx.podHash)
      .replaceAll('{age}', ctx.age)

  const startPipeline = async (commit) => {
    if (running) return
    const p = preset
    const s = state
    const myPresetToken = presetToken
    const myRunToken = ++activeRunToken
    clearTimeout(resetTimer)
    clearTimeout(regenTimer)
    clearInterval(uiTickTimer)

    running = true
    onRunningChange?.(true)
    s.runNo += 1
    const runNo = s.runNo
    let aborted = false
    const fail = /#fail\b/i.test(commit.msg)
    const nextVersion = bumpVersion(s.version, commit.msg)
    runStartMs = performance.now()
    const digest = `${randHex(12)}…`
    const runCtx = {
      hash: commit.hash,
      version: nextVersion,
      digest,
      runNo,
      env: p.env,
      podHash: s.podHash,
      age: '1s',
    }
    lastRunCtx = runCtx

    initNxRunner(p)
    if (runTitle) runTitle.textContent = `Run #${runNo} · ${p.ci} · ${p.env}`
    if (runStatus) {
      runStatus.dataset.state = 'running'
      runStatus.textContent = 'running'
    }

    const b = getBoard()
    if (b) {
      b.set('runMode', 1, true)
      b.set('doneMask', 0, true)
      b.set('boost', 0.65, true)
      for (let i = 1; i <= 6; i++) b.set(`st${i}`, 0.08, true)
      b.set('statusLabel', `RUN #${runNo} · QUEUED`, true)
    }

    spinTick = 0
    uiTickTimer = setInterval(() => {
      spinTick = (spinTick + 1) % SPIN_FRAMES.length
      renderNxTasks()
    }, 100)

    const runningSet = new Set()
    let doneMask = 0
    let pulseRaf = 0
    let failedStageName = ''

    const pulseTick = (now) => {
      pulseRaf = 0
      if (!runningSet.size || aborted) return
      const brd = getBoard()
      if (brd) {
        const val = reducedMotion ? 0.7 : 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(now * 0.006))
        for (const i of runningSet) brd.set(`st${i}`, val, true)
      }
      if (!reducedMotion) pulseRaf = requestAnimationFrame(pulseTick)
    }

    const runStage = async (stageIdx) => {
      if (aborted || presetToken !== myPresetToken) return

      const st = stageStates[stageIdx - 1]
      const stageName = st.name
      const isFailStage = fail && stageIdx === p.failStage
      const normalLines = p.logs[stageIdx] || []
      const lines = isFailStage ? [...normalLines.slice(0, 2), ...p.failLines] : normalLines

      st.status = 'running'
      st.startedAt = performance.now()
      renderNxTasks()

      runningSet.add(stageIdx)
      const brd = getBoard()
      if (brd) {
        if (reducedMotion) brd.set(`st${stageIdx}`, 0.7, true)
        brd.set('statusLabel', `RUN #${runNo} · ${stageName}`, true)
      }
      if (!pulseRaf && !reducedMotion) pulseRaf = requestAnimationFrame(pulseTick)

      appendNxLog({ kind: 'header', stageIdx, stageName })

      const durMs = (STAGE_DURS[stageIdx - 1] || 1400) * (reducedMotion ? 0.2 : 1)
      const stepMs = Math.max(40, Math.floor(durMs / Math.max(1, lines.length)))

      for (let li = 0; li < lines.length; li++) {
        await sleep(stepMs)
        if (presetToken !== myPresetToken) {
          runningSet.delete(stageIdx)
          return
        }
        if (aborted) {
          runningSet.delete(stageIdx)
          st.status = 'failed'
          st.durMs = performance.now() - st.startedAt
          appendNxLog({
            kind: 'line',
            ts: formatClock(performance.now() - runStartMs),
            stageIdx,
            stageName,
            text: '· cancelled',
            k: 'dim',
          })
          renderNxTasks()
          getBoard()?.set(`st${stageIdx}`, 0.08, true)
          return
        }
        appendNxLog({
          kind: 'line',
          ts: formatClock(performance.now() - runStartMs),
          stageIdx,
          stageName,
          text: formatLineTemplate(lines[li].t, runCtx),
          k: lines[li].k || 'dim',
        })
      }

      runningSet.delete(stageIdx)
      if (aborted || presetToken !== myPresetToken) {
        getBoard()?.set(`st${stageIdx}`, 0.08, true)
        return
      }

      st.durMs = performance.now() - st.startedAt
      if (isFailStage) {
        aborted = true
        st.status = 'failed'
        failedStageName = stageName
        renderNxTasks()
        getBoard()?.set(`st${stageIdx}`, 0.35, true)
        return
      }

      st.status = 'passed'
      renderNxTasks()
      doneMask |= 1 << (stageIdx - 1)
      const boardNow = getBoard()
      if (boardNow) {
        boardNow.set(`st${stageIdx}`, 1, true)
        boardNow.set('doneMask', doneMask, true)
      }
    }

    await runStage(1)
    if (!aborted && presetToken === myPresetToken) {
      await Promise.all([
        runStage(2).then(() => runStage(4)),
        runStage(3),
      ])
    }
    if (!aborted && presetToken === myPresetToken) await runStage(5)
    if (!aborted && presetToken === myPresetToken) await runStage(6)

    cancelAnimationFrame(pulseRaf)
    clearInterval(uiTickTimer)
    runningSet.clear()

    if (presetToken !== myPresetToken) {
      if (myRunToken === activeRunToken) {
        running = false
        onRunningChange?.(false)
      }
      return
    }

    const totalMs = performance.now() - runStartMs
    const totalSec = (totalMs / 1000).toFixed(1)
    if (runElapsed) runElapsed.textContent = formatClock(totalMs)
    const bEnd = getBoard()
    if (bEnd) bEnd.set('boost', 0, true)

    if (!aborted) {
      s.version = nextVersion
      s.deployedAt = Date.now()
      s.podHash = randHex(5)

      appendNxLog({
        kind: 'summary',
        ok: true,
        stageIdx: 6,
        stageName: p.stages[5],
        text: `✓ Deployed ${p.repo}:${s.version} to ${p.env} in ${totalSec}s`,
      })

      if (runStatus) {
        runStatus.dataset.state = 'passed'
        runStatus.textContent = 'passed'
      }
      if (btnNxInspect) btnNxInspect.hidden = false
      if (bEnd) bEnd.set('statusLabel', `RELEASED v${s.version} · ${totalSec}s`, true)

      regenTimer = setTimeout(() => {
        if (presetToken !== myPresetToken || running || busy) return
        s.modified = p.files.map((f) => ({
          path: f.path,
          add: Math.max(2, ((f.add * 0.6 + Math.random() * 24) | 0)),
          del: Math.max(1, ((f.del * 0.5 + Math.random() * 8) | 0)),
        }))
      }, 1000)
    } else {
      appendNxLog({
        kind: 'summary',
        ok: false,
        stageIdx: p.failStage,
        stageName: failedStageName,
        text: `✖ Release blocked at ${failedStageName} (${totalSec}s)`,
      })
      if (runStatus) {
        runStatus.dataset.state = 'failed'
        runStatus.textContent = 'failed'
      }
      if (bEnd) bEnd.set('statusLabel', `BLOCKED AT ${failedStageName}`, true)

      s.modified = [{ ...p.files[0], add: 6, del: 2 }]
    }

    if (myRunToken === activeRunToken) {
      running = false
      onRunningChange?.(false)
    }
    renderNxTasks()

    resetTimer = setTimeout(() => {
      if (activeRunToken !== myRunToken || presetToken !== myPresetToken || running) return
      const bReset = getBoard()
      if (bReset) {
        bReset.set('runMode', 0, true)
        bReset.set('doneMask', 0, true)
        for (let i = 1; i <= 6; i++) bReset.set(`st${i}`, 0.2, true)
        bReset.set('statusLabel', p.status, true)
      }
    }, 3500)
  }

  const runSandDissolve = async (myToken) => {
    if (reducedMotion || !wtViewGit || !termBody) {
      await sleep(80)
      return
    }

    const roots = [termOut, termPrompt, termTyped].filter(Boolean)
    const textNodes = []
    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node
      while ((node = walker.nextNode())) {
        if (node.nodeValue && /\S/.test(node.nodeValue)) textNodes.push(node)
      }
    }

    for (const tn of textNodes) {
      const frag = document.createDocumentFragment()
      for (const ch of tn.nodeValue) {
        if (/\s/.test(ch)) {
          frag.appendChild(document.createTextNode(ch))
        } else {
          const span = document.createElement('span')
          span.className = 'wt-sand-char'
          span.textContent = ch
          frag.appendChild(span)
        }
      }
      tn.parentNode?.replaceChild(frag, tn)
    }

    // Batched read pass (prevents layout thrashing before triggering CSS animations)
    const bodyRect = termBody.getBoundingClientRect()
    const bodyW = Math.max(1, bodyRect.width)
    const bodyH = Math.max(1, bodyRect.height)
    const charEls = [...wtViewGit.querySelectorAll('.wt-sand-char')]
    const coords = charEls.map((el) => {
      const r = el.getBoundingClientRect()
      const nx = Math.max(0, Math.min(1, (r.left - bodyRect.left) / bodyW))
      const ny = Math.max(0, Math.min(1, (r.top - bodyRect.top) / bodyH))
      return [el, nx, ny]
    })

    // Batched write pass: sweep from top-left + scatter sand up & left into thin air
    for (const [el, nx, ny] of coords) {
      const wave = nx * 0.52 + ny * 0.48
      const delay = Math.max(0, Math.round(wave * 420 + Math.random() * 240))
      const dx = -(18 + Math.random() * 34).toFixed(1)
      const dy = -(16 + Math.random() * 28).toFixed(1)
      const rot = -(4 + Math.random() * 16).toFixed(1)
      const dur = Math.round(380 + Math.random() * 240)
      el.style.setProperty('--sx', `${dx}px`)
      el.style.setProperty('--sy', `${dy}px`)
      el.style.setProperty('--sr', `${rot}deg`)
      el.style.setProperty('--sd', `${delay}ms`)
      el.style.setProperty('--dur', `${dur}ms`)
    }

    void wtViewGit.offsetWidth
    wtViewGit.classList.add('is-sand-blowing')

    await sleep(740)
    if (presetToken !== myToken) return
  }

  triggerPushSequence = async (alreadyTypedCmd = false, typedCmdText = 'git push') => {
    if (running || busy) return
    const myToken = presetToken
    setBusy(true)

    if (!state.ahead.length) {
      state.ahead.push({ hash: randHex(7), msg: preset.sampleMessage })
      updateHeaderMeta()
    }

    termInputLine?.classList.add('is-autotyping')
    if (termBody) termBody.scrollTop = termBody.scrollHeight

    if (!alreadyTypedCmd) {
      const cmd = 'git push'
      if (termTyped) termTyped.textContent = ''
      for (let i = 0; i < cmd.length; i++) {
        if (termTyped) termTyped.textContent += cmd[i]
        await sleep(reducedMotion ? 5 : 68 + ((Math.random() * 32) | 0))
        if (presetToken !== myToken) return
      }
    } else if (termTyped) {
      termTyped.textContent = typedCmdText
    }

    await sleep(reducedMotion ? 20 : 260)
    if (presetToken !== myToken) return

    const lastCommit = state.ahead[state.ahead.length - 1]
    for (const c of state.ahead) {
      state.history.unshift(`${c.hash} ${c.msg}`)
    }
    state.ahead = []

    await runSandDissolve(myToken)
    if (presetToken !== myToken) return

    setView('pipeline')
    await sleep(reducedMotion ? 20 : 420)
    if (presetToken !== myToken) return

    wtViewGit?.classList.remove('is-sand-blowing')
    termInputLine?.classList.remove('is-autotyping')
    if (termTyped) termTyped.textContent = ''
    setBusy(false)
    startPipeline(lastCommit)
  }

  const executeCommand = async (raw) => {
    const clean = raw.replace(/\s+/g, ' ').trim()
    if (clean) {
      cmdHistory.push(clean)
      histIdx = cmdHistory.length
    }
    if (!clean) {
      echoPromptCommand(clean)
      return
    }

    const low = clean.toLowerCase()
    const words = clean.split(' ')
    if (words[0]?.toLowerCase() === 'git' && (words[1] || '').toLowerCase() === 'push') {
      if (running || busy) return
      if (!state.ahead.length) {
        echoPromptCommand(clean)
        appendTermLine('Everything up-to-date')
        return
      }
      await triggerPushSequence(true, clean)
      return
    }

    echoPromptCommand(clean)
    const inspectPrefix = preset.inspectCmd.split(/\s+/).slice(0, 2).join(' ').toLowerCase()

    if (low === 'help') {
      appendTermLine('git status             inspect staged, modified & unpushed commits', 'sc-dim')
      appendTermLine('git add <file> | .     stage file(s) for commit', 'sc-dim')
      appendTermLine('git commit -m "msg"    create commit (include #fail to test gate failure)', 'sc-dim')
      appendTermLine('git push               push commits & transition to pipeline runner', 'sc-dim')
      appendTermLine('git log --oneline      show recent commits', 'sc-dim')
      appendTermLine(`${preset.inspectCmd.padEnd(22, ' ')} inspect running workloads`, 'sc-dim')
      appendTermLine('clear / cls            clear terminal output', 'sc-dim')
      return
    }

    if (low === 'clear' || low === 'cls') {
      if (termOut) termOut.textContent = ''
      return
    }

    if (low === 'whoami') {
      appendTermLine(`${preset.user}@${preset.host}`)
      return
    }

    if (low === 'ls' || low === 'dir') {
      const top = [...new Set(preset.files.map((f) => `${f.path.split('/')[0]}/`)), 'README.md']
      appendTermLine(top.join('  '))
      return
    }

    if (low.startsWith(inspectPrefix)) {
      const age = state.deployedAt ? `${Math.max(1, Math.round((Date.now() - state.deployedAt) / 1000))}s` : '3d'
      const ctx = {
        hash: (state.history[0] || '').slice(0, 7) || randHex(7),
        version: state.version,
        digest: `${randHex(12)}…`,
        runNo: state.runNo,
        env: preset.env,
        podHash: state.podHash,
        age,
      }
      for (const line of preset.inspect) {
        appendTermLine(formatLineTemplate(line.t, ctx), line.k === 'ok' ? 'sc-ok' : '')
      }
      return
    }

    if (words[0] === 'git') {
      const sub = words[1] || ''
      if (sub === 'status') {
        printGitStatus()
        return
      }

      if (sub === 'add') {
        const arg = words[2]
        if (!arg) {
          appendTermLine('Nothing specified, nothing added.', 'sc-dim')
          appendTermLine("Maybe you wanted to say 'git add .'?", 'sc-dim')
          return
        }
        if (arg === '.' || arg === '-A' || arg === '--all') {
          if (state.modified.length) {
            state.staged.push(...state.modified)
            state.modified = []
          }
          return
        }
        const mIdx = state.modified.findIndex((f) => f.path === arg || f.path.split('/').pop() === arg)
        if (mIdx >= 0) {
          const [item] = state.modified.splice(mIdx, 1)
          state.staged.push(item)
          return
        }
        const alreadyStaged = state.staged.some((f) => f.path === arg || f.path.split('/').pop() === arg)
        if (alreadyStaged) return
        appendTermLine(`fatal: pathspec '${arg}' did not match any files`, 'sc-err')
        return
      }

      if (sub === 'commit') {
        const rest = clean.slice('git commit'.length).trim()
        const allFlag = /^(-a\b|-am\b)/.test(rest) || /\s-a\b/.test(rest)
        const mMatch = rest.match(/(?:^|\s)-(?:a)?m(?:\s+|$)(.*)$/)

        if (!mMatch) {
          appendTermLine('Aborting commit due to empty commit message.', 'sc-err')
          appendTermLine('use: git commit -m "your message"', 'sc-dim')
          return
        }

        let msgRaw = (mMatch[1] || '').trim()
        let msg = ''
        if ((msgRaw.startsWith('"') && msgRaw.endsWith('"') && msgRaw.length >= 2) ||
            (msgRaw.startsWith("'") && msgRaw.endsWith("'") && msgRaw.length >= 2)) {
          msg = msgRaw.slice(1, -1).trim()
        } else if (msgRaw.startsWith('"') || msgRaw.startsWith("'")) {
          msg = msgRaw.slice(1).trim()
        } else {
          msg = msgRaw.split(' ')[0] || ''
        }

        if (!msg) {
          appendTermLine('Aborting commit due to empty commit message.', 'sc-err')
          appendTermLine('use: git commit -m "your message"', 'sc-dim')
          return
        }

        if (allFlag && state.modified.length) {
          state.staged.push(...state.modified)
          state.modified = []
        }

        if (!state.staged.length) {
          if (state.modified.length) {
            appendTermLine('no changes added to commit (use "git add" and/or "git commit -a")')
          } else {
            appendTermLine('nothing to commit, working tree clean', 'sc-dim')
          }
          return
        }

        const hash = randHex(7)
        const filesCount = state.staged.length
        const sumAdd = state.staged.reduce((a, f) => a + f.add, 0)
        const sumDel = state.staged.reduce((a, f) => a + f.del, 0)
        appendTermLine(`[main ${hash}] ${msg}`)
        appendTermLine(` ${filesCount} file${filesCount > 1 ? 's' : ''} changed, ${sumAdd} insertions(+), ${sumDel} deletions(-)`)
        state.ahead.push({ hash, msg })
        state.staged = []
        updateHeaderMeta()
        return
      }

      if (sub === 'log') {
        const localCommits = [...state.ahead].reverse().map((c) => `${c.hash} ${c.msg}`)
        const all = [...localCommits, ...state.history].slice(0, 8)
        all.forEach((entry, idx) => {
          const sp = entry.indexOf(' ')
          const h = sp > 0 ? entry.slice(0, sp) : entry
          const m = sp > 0 ? entry.slice(sp + 1) : ''
          let marker = ''
          if (idx === 0 && localCommits.length === 0) marker = ' (HEAD -> main, origin/main)'
          else if (idx === 0) marker = ' (HEAD -> main)'
          else if (idx === localCommits.length) marker = ' (origin/main)'
          appendTermLine(`${h}${marker} ${m}`, idx === 0 ? 'sc-cmd' : 'sc-dim')
        })
        return
      }

      appendTermLine(`git: '${sub}' is not a git command. See 'git --help'.`, 'sc-err')
      return
    }

    appendTermLine(`pwsh: '${words[0]}' is not recognized as a cmdlet or command.`, 'sc-err')
  }

  const pushFromUiOrDemo = () => {
    if (running || busy) return false
    const sec = document.getElementById('delivery')
    if (sec) {
      const r = sec.getBoundingClientRect()
      if (r.top < -80 || r.top > window.innerHeight * 0.55) {
        sec.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
      }
    }
    setPreset(activeIdx, { autoRun: true })
    return true
  }

  // Event wiring -------------------------------------------------------------
  termBody?.addEventListener('click', () => {
    if (!window.getSelection()?.toString()) termInput?.focus()
  })

  termInput?.addEventListener('keydown', (e) => {
    if (busy) { e.preventDefault(); return }

    if (e.key === 'Enter') {
      e.preventDefault()
      const val = termInput.value
      termInput.value = ''
      executeCommand(val)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (histIdx > 0) {
        histIdx -= 1
        termInput.value = cmdHistory[histIdx] || ''
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx < cmdHistory.length - 1) {
        histIdx += 1
        termInput.value = cmdHistory[histIdx] || ''
      } else {
        histIdx = cmdHistory.length
        termInput.value = ''
      }
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const cur = termInput.value.trimStart()
      const candidates = [
        'git push',
        'git status',
        'git log --oneline',
        'git add .',
        'git commit -m ""',
        'help',
        'clear',
        preset.inspectCmd,
      ]
      const hit = candidates.find((c) => c.startsWith(cur))
      if (hit) {
        termInput.value = hit
        if (hit === 'git commit -m ""') {
          const pos = hit.length - 1
          termInput.setSelectionRange(pos, pos)
        }
      }
    }
  })

  const backToGit = () => {
    clearTimeout(autoPushTimer)
    clearTimeout(resetTimer)
    clearTimeout(regenTimer)
    clearInterval(uiTickTimer)
    presetToken += 1
    activeRunToken += 1
    if (running) {
      running = false
      onRunningChange?.(false)
    }
    setBusy(false)

    const b = getBoard()
    if (b) {
      b.set('runMode', 0, true)
      b.set('doneMask', 0, true)
      b.set('boost', 0, true)
      for (let i = 1; i <= 6; i++) b.set(`st${i}`, 0.2, true)
      b.set('statusLabel', preset.status, true)
    }

    resetToPrewrittenGit()
    initNxRunner(preset)
    setView('git')
    setTimeout(() => {
      if (!running && !busy && wtWindow?.dataset.view === 'git') termInput?.focus()
    }, reducedMotion ? 10 : 280)
  }

  btnBackGit?.addEventListener('click', backToGit)
  btnWtClose?.addEventListener('click', () => {
    if (wtWindow?.dataset.view === 'pipeline') backToGit()
    else setPreset(activeIdx, { autoRun: true })
  })
  btnTermReset?.addEventListener('click', () => {
    if (!running && !busy) {
      setPreset(activeIdx, { autoRun: true })
      toast('Terminal session replayed')
    }
  })

  if (wtWindow && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target !== wtWindow) continue
          if (entry.isIntersecting && !hasAutoPlayed && !running && !busy && wtWindow.dataset.view === 'git') {
            hasAutoPlayed = true
            io.disconnect()
            const token = presetToken
            autoPushTimer = setTimeout(() => {
              if (presetToken === token && !running && !busy && wtWindow.dataset.view === 'git') {
                triggerPushSequence(false)
              }
            }, reducedMotion ? 30 : 650)
          }
        }
      },
      { threshold: 0.35 },
    )
    io.observe(wtWindow)
  }

  btnNxAll?.addEventListener('click', () => {
    selectedStage = 0
    syncNxHeader()
    renderNxTasks()
    renderNxLogs()
  })

  btnNxInspect?.addEventListener('click', () => {
    if (!lastRunCtx) return
    selectedStage = 0
    syncNxHeader()
    renderNxTasks()
    renderNxLogs()

    const ctx = {
      ...lastRunCtx,
      age: state.deployedAt ? `${Math.max(1, Math.round((Date.now() - state.deployedAt) / 1000))}s` : '2s',
    }
    appendNxLog({ kind: 'inspect', stageIdx: 0, text: `> ${preset.inspectCmd}`, k: 'cmd' })
    for (const ln of preset.inspect) {
      appendNxLog({
        kind: 'inspect',
        stageIdx: 0,
        text: formatLineTemplate(ln.t, ctx),
        k: ln.k || 'dim',
      })
    }
  })

  return {
    setPreset,
    runDemo: pushFromUiOrDemo,
    isRunning: () => running,
  }
}
