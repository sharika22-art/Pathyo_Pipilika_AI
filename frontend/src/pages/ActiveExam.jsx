import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ActiveExam() {
  const navigate = useNavigate();
  
  // Dummy questions for now (will be replaced by Agent 1's live output on Day 6)
  const questions = [
    {
      id: 1,
      question: "Which cellular organelle is known as the powerhouse of the cell?",
      options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Apparatus"],
      answer: "Mitochondria"
    },
    {
      id: 2,
      question: "What is the primary site of photosynthesis in plant cells?",
      options: ["Chloroplast", "Vacuole", "Endoplasmic Reticulum", "Lysosome"],
      answer: "Chloroplast"
    },
    {
      id: 3,
      question: "Which blood cells are responsible for defending the body against pathogens?",
      options: ["Red Blood Cells", "White Blood Cells", "Platelets", "Plasma"],
      answer: "White Blood Cells"
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question
  const [tabSwitches, setTabSwitches] = useState(0);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      handleNext();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSelectOption = (option) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentIndex]: option
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setTimeLeft(30); // Reset timer for next question
    } else {
      finishExam();
    }
  };

  const finishExam = () => {
    // Calculate correct answers
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answer) {
        correctCount++;
      }
    });

    console.log(`Exam finished! Correct: ${correctCount}/${questions.length}, Tab Switches: ${tabSwitches}`);
    // Navigate back to dashboard (on Day 6, we will send this payload to FastAPI)
    navigate('/');
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto p-6 pt-16">
      {/* Top Bar: Progress & Timer */}
      <div className="flex justify-between items-center mb-8 bg-slate-800 p-4 rounded-xl border border-slate-700">
        <span className="text-slate-400 font-medium">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
          <span className="text-red-400">⏳</span>
          <span className={`font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-xl mb-6">
        <h2 className="text-2xl font-bold text-white mb-6">{currentQ.question}</h2>

        <div className="space-y-4">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedAnswers[currentIndex] === option;
            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(option)}
                className={`w-full text-left p-4 rounded-xl border font-medium transition-all ${
                  isSelected 
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' 
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-end">
        <button
          onClick={handleNext}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg"
        >
          {currentIndex === questions.length - 1 ? 'Submit Exam 🚀' : 'Next Question ➡'}
        </button>
      </div>
    </div>
  );
}