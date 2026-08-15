'use strict';

/*
 * enghealth 测试套件（零依赖，用 Node 内置 assert）
 * 覆盖：参数解析、overview 扫描、兄弟发现/容错解析、门禁、dogfood 自检（扫自身归零噪音）。
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const CLI = path.join(__dirname, 'index.js');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.error('  ✗ ' + name + '\n    ' + (e && e.message)); }
}

// 临时目录工具：创建一个最小有效项目
function mkProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'enghealth-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}

console.log('enghealth 测试套件');

// 1) --version / --help 退出码
t('version 输出 1.0.0 且退出 0', () => {
  const out = execFileSync('node', [CLI, '--version'], { encoding: 'utf8' });
  assert.strictEqual(out.trim(), '1.0.0');
});
t('help 退出 0', () => {
  const out = execFileSync('node', [CLI, '--help'], { encoding: 'utf8' });
  assert.ok(out.includes('元仪表盘'));
});

// 2) 干净项目 overview 满分
t('干净项目 overview 健康分 = 100', () => {
  const dir = mkProject({
    'package.json': JSON.stringify({ name: 'demo', version: '1.0.0', license: 'MIT' }),
    'README.md': '# demo',
    'LICENSE': 'MIT',
    'package-lock.json': '{}',
    '.gitignore': '.env\nnode_modules',
    'src/index.js': 'module.exports = 1;',
    'test/index.test.js': "const a = 1;",
    '.git/config': '', // 伪 git
  });
  const out = JSON.parse(execFileSync('node', [CLI, '--json', dir], { encoding: 'utf8' }));
  assert.strictEqual(out.overviewScore, 100, '干净项目概览应满分');
  assert.strictEqual(out.overallScore, 100);
  assert.strictEqual(out.gate.passed, true);
});

// 3) 脏项目应报 medium/low 且分数下降
t('脏项目（缺 LICENSE/README/测试）扣分', () => {
  const dir = mkProject({
    'src/a.js': 'x=1;',
    // 无任何其它文件
  });
  const out = JSON.parse(execFileSync('node', [CLI, '--json', dir], { encoding: 'utf8' }));
  assert.ok(out.overviewScore < 100, '脏项目应扣分');
  const msgs = out.overviewIssues.map((i) => i.msg).join('|');
  assert.ok(msgs.includes('LICENSE') || msgs.includes('README') || msgs.includes('测试'), '应报出缺失项');
});

// 4) .env 未被忽略 → medium 密钥风险
t('.env 未忽略报告密钥风险', () => {
  const dir = mkProject({
    'package.json': JSON.stringify({ name: 'd', version: '1.0.0' }),
    'README.md': 'r',
    'LICENSE': 'MIT',
    '.env': 'SECRET=1',
    'package-lock.json': '{}',
    '.gitignore': 'node_modules',
  });
  const out = JSON.parse(execFileSync('node', [CLI, '--json', dir], { encoding: 'utf8' }));
  const msgs = out.overviewIssues.map((i) => i.msg).join('|');
  assert.ok(msgs.includes('.env'), '应报 .env 泄露风险');
});

// 5) 兄弟 CLI 容错解析（行为级）：构造一个真实可执行的「伪兄弟」放到 ol-<name>/index.js，
//    使其命中注册表中的某个名字（用 testlite 名，避免误改真实工具），验证分数被并入。
t('兄弟 JSON（score 字段）可容错解析并入矩阵', () => {
  // 准备一个临时 family 目录，内含 ol-testlite 伪 CLI（输出 {score:85}）
  const famDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eng-fam-'));
  const olDir = path.join(famDir, 'ol-testlite');
  fs.mkdirSync(olDir, { recursive: true });
  fs.writeFileSync(path.join(olDir, 'index.js'),
    "#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({score:85,gate:{passed:true}}));\nprocess.exit(0);\n");
  const dir = mkProject({ 'README.md': 'r', 'LICENSE': 'MIT' });
  const out = JSON.parse(execFileSync('node', [CLI, '--json', '--tools-dir', famDir, dir], { encoding: 'utf8' }));
  const tl = out.brothers.find((b) => b.name === 'testlite');
  assert.ok(tl && tl.found, 'testlite 应被发现');
  assert.strictEqual(tl.score, 85, '应解析出 score=85');
});

// 6) --tools-dir 发现真实兄弟（用 family 源码回退）
t('--tools-dir 指向 family 源码并入兄弟体检', () => {
  const familyDir = path.join(__dirname, '..'); // forge/projects/2026-08-15/
  const target = mkProject({ 'README.md': 'r', 'LICENSE': 'MIT', 'package.json': JSON.stringify({ name: 'x', version: '1.0.0' }) });
  // 仅找一个真实存在的兄弟（pkgdoctor 必存在）
  const out = JSON.parse(execFileSync('node', [CLI, '--json', '--tools-dir', familyDir, target], { encoding: 'utf8' }));
  const found = out.brothers.filter((b) => b.found && b.score !== null);
  assert.ok(found.length >= 1, '至少应发现 pkgdoctor 并入分数');
  const pkg = out.brothers.find((b) => b.name === 'pkgdoctor');
  assert.ok(pkg && pkg.score !== null, 'pkgdoctor 分数应被解析');
});

// 7) 未提供 --tools-dir：所有兄弟跳过，自身仍出体检
t('无 --tools-dir 时兄弟全跳过、自身独立出报告', () => {
  const dir = mkProject({ 'README.md': 'r', 'LICENSE': 'MIT' });
  const out = JSON.parse(execFileSync('node', [CLI, '--json', dir], { encoding: 'utf8' }));
  assert.strictEqual(out.brothersFound, 0);
  assert.strictEqual(out.overallScore, out.overviewScore);
  assert.strictEqual(out.gate.passed, true);
});

// 8) 门禁 --min-overall
t('--min-overall 低于总分则 FAIL(退出2)', () => {
  const dir = mkProject({ 'README.md': 'r', 'LICENSE': 'MIT' });
  let code = 0;
  try {
    execFileSync('node', [CLI, '--json', '--min-overall', '200', dir], { encoding: 'utf8' });
  } catch (e) { code = e.status; }
  assert.strictEqual(code, 2, '总分不可能 200，门禁应失败');
});

// 9) --json 纯 JSON（pkgdoctor 铁律）：输出可被 JSON.parse 且不含尾部文本
t('--json 输出为纯 JSON 可解析', () => {
  const dir = mkProject({ 'README.md': 'r', 'LICENSE': 'MIT' });
  const raw = execFileSync('node', [CLI, '--json', dir], { encoding: 'utf8' });
  let ok = false;
  try { JSON.parse(raw); ok = true; } catch {}
  assert.strictEqual(ok, true, 'stdout 必须是纯 JSON');
  assert.ok(!raw.includes('CI 门禁'), 'json 模式不得含门禁文本');
});

// 10) dogfood 自检：扫自身仓库应无「伪问题」噪音
t('dogfood：扫 enghealth 自身 overview 不报 LICENSE/README 缺失', () => {
  const out = JSON.parse(execFileSync('node', [CLI, '--json', __dirname], { encoding: 'utf8' }));
  const msgs = out.overviewIssues.map((i) => i.msg).join('|');
  assert.ok(!msgs.includes('LICENSE'), 'enghealth 自身有 LICENSE');
  assert.ok(!msgs.includes('README'), 'enghealth 自身有 README');
});

// 11) 兄弟维度缺失语义：纯 JS 项目 typedoctor 正确标 missing 而非崩溃
t('纯 JS 项目下 typedoctor 维度标 missing 不崩溃', () => {
  // 用含 typedoctor 的 family 目录，但目标是一个纯 JS 单文件临时项目
  const famDir = path.join(__dirname, '..'); // 2026-08-15 含 ol-typodoctor
  const dir = mkProject({ 'README.md': 'r', 'LICENSE': 'MIT', 'a.js': 'const x=1;' });
  const out = JSON.parse(execFileSync('node', [CLI, '--json', '--tools-dir', famDir, dir], { encoding: 'utf8' }));
  const tl = out.brothers.find((b) => b.name === 'typedoctor');
  assert.ok(tl, 'typedoctor 应被发现');
  // 纯 JS 项目无 TS 类型：typedoctor 返回空 → enghealth 标 missing（维度不适用），不计入分母
  assert.strictEqual(tl.status, 'missing', '纯 JS 项目 typedoctor 维度应标 missing');
  assert.strictEqual(tl.score, null, 'missing 维度分数应为 null');
  assert.strictEqual(out.gate.passed, true, '不应因缺失维度误判门禁');
});

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail === 0 ? 0 : 1);
