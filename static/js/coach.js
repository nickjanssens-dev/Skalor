/**
 * SKALOR AI COACH SYSTEM
 * Provides dynamic, context-aware advice to the user.
 */

window.AICoach = {
    messages: {
        new: [
            "Welkom bij Skalor! Ik ben je AI Coach. 🤖",
            "Klaar om je leerproces naar een hoger niveau te tillen?",
            "Begin door een vak te kiezen of bekijk de Skill Tree!"
        ],
        returning: [
            "Welkom terug! Je bent goed bezig. 🚀",
            "Je hebt al {coins} coins verdiend. Laten we dat vandaag verhogen!",
            "Rond een nieuwe skill af om je streak te behouden."
        ],
        levelUp: [
            "Wow! Je bent bijna Level {nextLevel}! 📈",
            "Nog maar {remaining} coins te gaan tot je volgende upgrade."
        ],
        suggestions: {
            biologie: "Ik zie dat je Biologie nog niet hebt geprobeerd. Wist je dat we een coole DNA quiz hebben? 🧬",
            chemie: "Interesse in scheikunde? De Atoomleer module wacht op je! ⚗️",
            wiskunde: "Wiskunde is de basis van alles. Heb je de Algebra skills al bekeken? 📐"
        }
    },

    init() {
        const stats = window.SkalorStats.get();
        const display = document.getElementById('coach-text');
        if (!display) return;

        let message = "";

        if (stats.coins === 0) {
            message = this.messages.new[Math.floor(Math.random() * this.messages.new.length)];
        } else {
            // Mapping subjects to their ID prefixes
            const subjectMap = {
                'biologie': ['f', 'd', 'l', 't', 'a'],
                'chemie': ['at', 'bi', 're', 'or', 'mo'],
                'wiskunde': ['alg', 'geo', 'sta', 'cal']
            };

            const untouched = Object.keys(subjectMap).filter(subject => {
                const prefixes = subjectMap[subject];
                return !Object.keys(stats.completedLeaves).some(leafId => 
                    prefixes.some(p => leafId.startsWith(p))
                );
            });
            
            if (untouched.length > 0 && Math.random() > 0.4) {
                const choice = untouched[Math.floor(Math.random() * untouched.length)];
                message = this.messages.suggestions[choice] || "Je bent goed bezig! Probeer eens een nieuw vak.";
            } else {
                message = this.messages.returning[Math.floor(Math.random() * this.messages.returning.length)]
                    .replace("{coins}", stats.coins);
            }
        }


        this.typeMessage(message, display);
    },

    typeMessage(text, element) {
        element.textContent = "";
        element.classList.add('typing');
        
        let i = 0;
        const speed = 40; // ms per character

        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else {
                element.classList.remove('typing');
            }
        }

        type();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Small delay to make it feel like the coach is "thinking"
    setTimeout(() => {
        window.AICoach.init();
    }, 800);
});
