// ─── SKALOR MOCK EXAM ENGINE ────────────────────────────────────────────────
console.log("MX: Script loaded");

const MX = {
  state: 'setup',
  questions: [],
  currentIndex: 0,
  answers: [],
  timer: null,
  timeLeft: 0,
  totalTime: 0,
  uploadedQuestions: null,

  $: id => document.getElementById(id),

  show(phase) {
    console.log('MX: Switching to phase:', phase);
    const phases = ['setup-phase', 'exam-phase', 'results-phase'];
    phases.forEach(id => {
      const el = this.$(id);
      if (el) el.classList.add('hidden');
    });
    const target = this.$(`${phase}-phase`);
    if (target) {
      target.classList.remove('hidden');
      console.log(`MX: ${phase}-phase is now visible`);
    } else {
      console.error(`MX: Target ${phase}-phase not found!`);
    }
    this.state = phase;
  },

  async startExam() {
    console.log('MX: startExam button clicked');
    
    // 1. Check for uploaded questions first
    if (this.uploadedQuestions && this.uploadedQuestions.length > 0) {
      console.log('MX: Using uploaded questions:', this.uploadedQuestions.length);
      this.questions = [...this.uploadedQuestions];
    } else {
      // 2. Otherwise fetch from subject
      const subjectEl = this.$('exam-subject');
      const amountEl = this.$('exam-amount');
      
      if (!subjectEl) {
        console.error("MX: Could not find #exam-subject");
        return;
      }
      
      const subject = subjectEl.value;
      const amount = amountEl ? parseInt(amountEl.value) : 10;
      const btn = this.$('start-exam-btn');
      
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Bezig...';
      }

      try {
        console.log(`MX: Fetching ${amount} questions for subject: ${subject}`);
        const res = await fetch(`/api/${subject}/mock-exam?amount=${amount}`);
        if (!res.ok) throw new Error('Geen vragen gevonden of server fout.');
        
        const data = await res.json();
        this.questions = data.questions;
        console.log('MX: Questions fetched successfully:', this.questions.length);
      } catch (err) {
        console.error('MX Fetch Error:', err);
        this.showSetupError(err.message);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-play"></i> Start Examen';
        }
        return;
      }
    }

    if (!this.questions || this.questions.length === 0) {
      this.showSetupError('Geen vragen beschikbaar. Probeer een ander vak of upload.');
      return;
    }

    // 3. Initialize exam state
    this.currentIndex = 0;
    this.answers = [];
    const timeEl = this.$('exam-time');
    const timeSetting = timeEl ? (parseInt(timeEl.value) || 0) : 0;
    this.totalTime = timeSetting * 60;
    this.timeLeft = this.totalTime;

    console.log(`MX: Starting exam with ${this.questions.length} questions`);
    this.show('exam');
    this.renderQuestion();

    if (this.totalTime > 0) {
      const ts = this.$('timer-section');
      if (ts) ts.classList.remove('hidden');
      this.startTimer();
    } else {
      const ts = this.$('timer-section');
      if (ts) ts.classList.add('hidden');
    }
  },

  showSetupError(msg) {
    const el = this.$('setup-error');
    if (!el) {
      alert(msg); // Fallback
      return;
    }
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
  },

  async handleFileUpload(file) {
    if (!file) return;
    console.log('MX: Handling file upload:', file.name);
    
    const status = this.$('upload-status');
    if (status) {
      status.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploaden...';
      status.style.color = 'var(--skalor-accent)';
    }
    this.uploadedQuestions = null;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload/generate-quiz', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Kon document niet verwerken');
      }
      const data = await res.json();
      this.uploadedQuestions = data.questions;
      console.log('MX: File processed, questions:', data.question_count);
      
      if (status) {
        status.innerHTML = `<i class="fa-solid fa-check"></i> ${data.question_count} vragen geladen!`;
        status.style.color = '#27ae60';
      }
      
      const btn = this.$('start-exam-btn');
      if (btn) btn.style.boxShadow = '0 0 15px var(--skalor-accent)';
    } catch (err) {
      console.error('MX Upload Error:', err);
      if (status) {
        status.innerHTML = `<i class="fa-solid fa-xmark"></i> ${err.message}`;
        status.style.color = '#eb5757';
      }
    }
  },

  renderQuestion() {
    const q = this.questions[this.currentIndex];
    const total = this.questions.length;
    console.log(`MX: Rendering question ${this.currentIndex + 1}/${total}`);

    const pb = this.$('exam-progress-bar');
    if (pb) pb.style.width = ((this.currentIndex / total) * 100) + '%';
    
    const qNum = this.$('exam-q-num');
    if (qNum) qNum.textContent = this.currentIndex + 1;
    
    const qTotal = this.$('exam-q-total');
    if (qTotal) qTotal.textContent = total;

    const scoreDisp = this.$('exam-score-display');
    if (scoreDisp) {
      const correctCount = this.answers.filter(a => a.selected === a.correct).length;
      scoreDisp.textContent = correctCount;
    }

    const qText = this.$('question-text');
    if (qText) qText.textContent = q.question;

    const optionsEl = this.$('question-options');
    if (optionsEl) {
      optionsEl.innerHTML = '';
      const labels = ['A', 'B', 'C', 'D'];
      q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<span class="option-label">${labels[i] || i + 1}</span><span class="option-text">${opt}</span>`;
        btn.onclick = () => this.selectAnswer(i);
        optionsEl.appendChild(btn);
      });
    }

    const nextBtn = this.$('next-btn');
    if (nextBtn) nextBtn.classList.add('hidden');
    
    const fb = this.$('question-feedback');
    if (fb) {
      fb.textContent = '';
      fb.className = 'question-feedback';
    }

    const card = this.$('question-card');
    if (card) {
      card.style.opacity = '0';
      setTimeout(() => {
        card.style.transition = 'opacity 0.3s ease';
        card.style.opacity = '1';
      }, 50);
    }
  },

  selectAnswer(selectedIndex) {
    const q = this.questions[this.currentIndex];
    const correctIndex = q.answer;
    const isCorrect = selectedIndex === correctIndex;

    this.answers.push({ selected: selectedIndex, correct: correctIndex, question: q.question, options: q.options });

    document.querySelectorAll('.option-btn').forEach((btn, i) => {
      btn.disabled = true;
      if (i === correctIndex) btn.classList.add('correct');
      else if (i === selectedIndex && !isCorrect) btn.classList.add('wrong');
    });

    const fb = this.$('question-feedback');
    if (fb) {
      fb.textContent = isCorrect ? '✓ Correct!' : '✗ Fout';
      fb.className = 'question-feedback ' + (isCorrect ? 'correct' : 'wrong');
    }

    const nextBtn = this.$('next-btn');
    if (nextBtn) {
      nextBtn.classList.remove('hidden');
      if (this.currentIndex === this.questions.length - 1) {
        nextBtn.innerHTML = 'Resultaten bekijken <i class="fa-solid fa-flag-checkered"></i>';
      } else {
        nextBtn.innerHTML = 'Volgende <i class="fa-solid fa-arrow-right"></i>';
      }
    }
  },

  nextQuestion() {
    this.currentIndex++;
    if (this.currentIndex >= this.questions.length) this.finishExam();
    else this.renderQuestion();
  },

  startTimer() {
    this.stopTimer();
    this.updateTimerDisplay();
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateTimerDisplay();
      if (this.timeLeft <= 0) { 
        clearInterval(this.timer); 
        this.finishExam(); 
      }
    }, 1000);
  },

  stopTimer() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  },

  updateTimerDisplay() {
    const m = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
    const s = (this.timeLeft % 60).toString().padStart(2, '0');
    const td = this.$('timer-display');
    if (td) td.textContent = `${m}:${s}`;
  },

  finishExam() {
    this.stopTimer();
    while (this.answers.length < this.questions.length) {
      const q = this.questions[this.answers.length];
      this.answers.push({ selected: -1, correct: q.answer, question: q.question, options: q.options });
    }

    const total = this.questions.length;
    let correct = 0;
    this.answers.forEach(a => {
        if (a.selected != -1 && a.selected == a.correct) {
            correct++;
        }
    });

    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = pct >= 60;

    // Award Coins
    let coinsEarned = correct * 10;
    let perfectBonus = false;
    if (correct === total && total > 0) {
      coinsEarned += 30;
      perfectBonus = true;
    }

    console.log(`MX: Exam finished. Correct: ${correct}/${total}. Coins earned: ${coinsEarned}`);

    if (window.SkalorStats) {
      window.SkalorStats.addCoins(coinsEarned);
    }

    if (this.$('result-score-pct')) this.$('result-score-pct').textContent = pct + '%';
    if (this.$('result-verdict')) {
      this.$('result-verdict').textContent = passed ? '🎉 Geslaagd!' : '😔 Niet geslaagd';
      this.$('result-verdict').style.color = passed ? '#27ae60' : '#eb5757';
    }
    
    if (this.$('result-correct')) this.$('result-correct').textContent = correct;
    if (this.$('result-wrong')) this.$('result-wrong').textContent = this.answers.filter(a => a.selected !== a.correct && a.selected !== -1).length;
    if (this.$('result-skipped')) this.$('result-skipped').textContent = this.answers.filter(a => a.selected === -1).length;
    if (this.$('result-total')) this.$('result-total').textContent = total;

    // Display coins earned
    const coinResultEl = this.$('result-coins');
    if (coinResultEl) {
        coinResultEl.textContent = `+${coinsEarned}`;
        const bonusEl = this.$('result-bonus');
        if (bonusEl) {
            bonusEl.textContent = perfectBonus ? '(incl. 30 Perfectie Bonus!)' : '';
            bonusEl.style.display = perfectBonus ? 'block' : 'none';
        }
    }

    const ring = this.$('score-ring-progress');
    if (ring) {
      const circumference = 339.292;
      ring.style.strokeDasharray = circumference;
      ring.style.strokeDashoffset = circumference - (pct / 100) * circumference;
      ring.style.stroke = passed ? 'var(--skalor-accent)' : '#ff6e6e';
    }

    const reviewEl = this.$('wrong-answers-review');
    if (reviewEl) {
      const wrongAnswers = this.answers.filter(a => a.selected !== a.correct);
      if (wrongAnswers.length === 0) {
        reviewEl.innerHTML = '<p style="text-align:center; padding: 2rem;">🏆 Perfecte score! Je beheerst deze stof volledig.</p>';
      } else {
        reviewEl.innerHTML = wrongAnswers.map((a, i) => `
          <div class="review-item" style="padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <p><strong>${a.question}</strong></p>
            <p style="color: #eb5757; font-size: 0.9rem;">Jouw antwoord: ${a.selected === -1 ? '(Geen)' : a.options[a.selected]}</p>
            <p style="color: #27ae60; font-size: 0.9rem;">Correct: ${a.options[a.correct]}</p>
          </div>
        `).join('');
      }
    }

    this.show('results');
  },

  resetToSetup() {
    this.questions = [];
    this.currentIndex = 0;
    this.answers = [];
    this.uploadedQuestions = null;
    this.stopTimer();
    const btn = this.$('start-exam-btn');
    if (btn) { 
        btn.disabled = false; 
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Start Examen'; 
        btn.style.boxShadow = 'none';
    }
    const us = this.$('upload-status');
    if (us) { us.textContent = ''; us.className = 'upload-status'; }
    this.show('setup');
  },

  init() {
    console.log('MX: Initializing...');
    
    const slider = this.$('exam-amount');
    const sliderVal = this.$('exam-amount-val');
    if (slider && sliderVal) {
      slider.oninput = () => { sliderVal.textContent = slider.value; };
    }

    const startBtn = this.$('start-exam-btn');
    if (startBtn) startBtn.onclick = () => this.startExam();

    const nextBtn = this.$('next-btn');
    if (nextBtn) nextBtn.onclick = () => this.nextQuestion();

    ['retry-btn', 'new-exam-btn', 'quit-btn'].forEach(id => {
      const el = this.$(id);
      if (el) el.onclick = () => this.resetToSetup();
    });

    const fileInput = this.$('file-upload-input');
    const dropZone = this.$('drop-zone');

    if (fileInput) {
      fileInput.onchange = e => this.handleFileUpload(e.target.files[0]);
    }

    if (dropZone) {
      dropZone.onclick = () => {
        console.log("MX: Drop zone clicked");
        if (fileInput) fileInput.click();
      };
      
      dropZone.ondragover = e => { 
        e.preventDefault(); 
        dropZone.style.borderColor = 'var(--skalor-accent)'; 
        dropZone.style.background = 'rgba(255,255,255,0.05)';
      };
      
      dropZone.ondragleave = () => { 
        dropZone.style.borderColor = 'rgba(255,255,255,0.1)'; 
        dropZone.style.background = 'transparent';
      };
      
      dropZone.ondrop = e => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
        dropZone.style.background = 'transparent';
        if (e.dataTransfer.files[0]) this.handleFileUpload(e.dataTransfer.files[0]);
      };
    }

    this.show('setup');
    console.log('MX: Init complete.');
  }
};

// Start logic
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => MX.init());
} else {
  MX.init();
}