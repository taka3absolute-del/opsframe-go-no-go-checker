const questions = [
  { id: "scope", title: "変更対象と作業範囲が明確になっていますか？", help: "対象システム、作業内容、対象外の範囲が関係者に共有されている。", critical: true },
  { id: "approval", title: "必要な承認を得ていますか？", help: "組織の規程に沿った責任者・変更承認者の承認が完了している。", critical: true },
  { id: "impact", title: "影響範囲とリスクを評価しましたか？", help: "停止、性能、連携先、利用者、セキュリティへの影響を確認している。", critical: true },
  { id: "test", title: "事前検証または手順のレビューを実施しましたか？", help: "検証環境での試験、または有識者による手順レビューが完了している。", critical: false },
  { id: "backup", title: "必要なバックアップを取得・確認しましたか？", help: "復旧に必要なデータや設定が保全され、利用可能であることを確認している。", critical: true },
  { id: "rollback", title: "切り戻し条件と手順が明確ですか？", help: "中止を決める条件、判断者、復旧手順、想定時間が整理されている。", critical: true },
  { id: "window", title: "作業時間と切り戻し時間を確保していますか？", help: "検証や不測の事態も含め、許容停止時間内に収まる計画になっている。", critical: false },
  { id: "roles", title: "作業者・確認者・判断者の役割が明確ですか？", help: "実施、ダブルチェック、Go/No-Go判断、連絡の担当者が決まっている。", critical: false },
  { id: "communication", title: "関係者への事前連絡が完了していますか？", help: "利用者、サービスデスク、運用担当、関連ベンダーに必要な連絡をしている。", critical: false },
  { id: "monitoring", title: "変更後の確認項目と監視方法がありますか？", help: "正常性を判断する指標、確認手順、監視時間、異常時の基準が決まっている。", critical: true },
  { id: "dependencies", title: "関連システム・作業との競合がないことを確認しましたか？", help: "他の変更、バッチ、バックアップ、リリース、保守作業との重複を確認している。", critical: false },
  { id: "contacts", title: "障害時の連絡先とエスカレーション先が明確ですか？", help: "緊急連絡先、ベンダー窓口、責任者への連絡順序がすぐ参照できる。", critical: false }
];

const options = [
  { value: "yes", label: "Yes" },
  { value: "review", label: "要確認" },
  { value: "no", label: "No" }
];

const form = document.querySelector("#check-form");
const questionsRoot = document.querySelector("#questions");
const resultPanel = document.querySelector("#result");
const formError = document.querySelector("#form-error");

function renderQuestions() {
  questionsRoot.innerHTML = questions.map((question, index) => `
    <fieldset class="question" id="question-${question.id}">
      <legend><span class="question-number">${String(index + 1).padStart(2, "0")}</span><span>${question.title}</span></legend>
      <p class="question-help" id="help-${question.id}">${question.help}</p>
      <div class="option-group" role="radiogroup" aria-describedby="help-${question.id}">
        ${options.map(option => `
          <div class="option">
            <input type="radio" name="${question.id}" id="${question.id}-${option.value}" value="${option.value}">
            <label for="${question.id}-${option.value}">${option.label}</label>
          </div>
        `).join("")}
      </div>
    </fieldset>
  `).join("");
}

function getAnswers() {
  return questions.map(question => ({
    ...question,
    value: form.elements[question.id].value || null
  }));
}

function updateProgress() {
  const answered = getAnswers().filter(answer => answer.value).length;
  document.querySelector("#answered-count").textContent = answered;
  document.querySelector("#progress-bar").style.width = `${(answered / questions.length) * 100}%`;
  document.querySelector(".progress-track").setAttribute("aria-valuenow", answered);
  if (answered === questions.length) {
    formError.hidden = true;
  }
}

function evaluate(answers) {
  const yes = answers.filter(answer => answer.value === "yes");
  const review = answers.filter(answer => answer.value === "review");
  const no = answers.filter(answer => answer.value === "no");
  const criticalNo = no.filter(answer => answer.critical);
  const criticalReview = review.filter(answer => answer.critical);

  if (criticalNo.length > 0 || no.length >= 2) {
    return {
      key: "nogo",
      label: "NO-GO",
      summary: "現時点では変更開始を見合わせ、重大な未対応項目を解消してから再判定することを推奨します。",
      yes, review, no, criticalNo, criticalReview
    };
  }

  if (no.length === 1 || review.length > 0) {
    return {
      key: "conditional",
      label: "CONDITIONAL GO",
      summary: "条件付きで進められる可能性があります。未確認事項の確認結果と残存リスクを、責任者と合意してから開始してください。",
      yes, review, no, criticalNo, criticalReview
    };
  }

  return {
    key: "go",
    label: "GO",
    summary: "主要な準備項目は確認済みです。直前の状況変化がないかを確認し、組織の承認プロセスに従って最終判断してください。",
    yes, review, no, criticalNo, criticalReview
  };
}

function reasonMessages(result) {
  const messages = [];
  if (result.key === "go") {
    messages.push("12項目すべてが「Yes」です。", "重大項目に未確認・未対応の回答はありません。");
  } else {
    if (result.criticalNo.length) messages.push(`重大項目で「No」が${result.criticalNo.length}件あります。`);
    if (result.no.length) messages.push(`未対応の項目が${result.no.length}件あります。`);
    if (result.review.length) messages.push(`確認が完了していない項目が${result.review.length}件あります。`);
    if (!result.criticalNo.length && result.no.length === 1) messages.push("未対応は1件ですが、開始前の解消または責任者との合意が必要です。");
  }
  return messages;
}

function showResult(result) {
  const status = document.querySelector("#result-status");
  status.className = `result-status ${result.key === "go" ? "" : result.key}`.trim();
  document.querySelector("#result-title").textContent = result.label;
  document.querySelector("#result-summary").textContent = result.summary;
  document.querySelector("#yes-count").textContent = result.yes.length;
  document.querySelector("#reason-list").innerHTML = reasonMessages(result).map(message => `<li>${message}</li>`).join("");

  const pending = [...result.no, ...result.review];
  document.querySelector("#pending-list").innerHTML = pending.map(item => {
    const state = item.value === "no" ? "未対応" : "要確認";
    const critical = item.critical ? "・重大項目" : "";
    return `<li><strong>${state}${critical}：</strong>${item.title}</li>`;
  }).join("");
  document.querySelector("#pending-list").hidden = pending.length === 0;
  document.querySelector("#no-pending").hidden = pending.length !== 0;

  resultPanel.hidden = false;
  resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => resultPanel.focus({ preventScroll: true }), 350);
}

form.addEventListener("change", updateProgress);
form.addEventListener("submit", event => {
  event.preventDefault();
  const answers = getAnswers();
  const unanswered = answers.filter(answer => !answer.value);
  if (unanswered.length) {
    formError.textContent = `未回答の項目が${unanswered.length}件あります。すべて回答してから判定してください。`;
    formError.hidden = false;
    const target = document.querySelector(`#question-${unanswered[0].id}`);
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => target.querySelector("input").focus({ preventScroll: true }), 350);
    return;
  }
  formError.hidden = true;
  showResult(evaluate(answers));
});

document.querySelector("#reset-button").addEventListener("click", () => {
  form.reset();
  resultPanel.hidden = true;
  formError.hidden = true;
  updateProgress();
  document.querySelector("#checker").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#edit-button").addEventListener("click", () => {
  document.querySelector("#checker").scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => questionsRoot.querySelector("input").focus({ preventScroll: true }), 350);
});

renderQuestions();
updateProgress();

