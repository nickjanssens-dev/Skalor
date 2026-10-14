# 🎮 Skalor - Gamified Leerplatform

Skalor is een gamified leerplatform voor middelbare scholieren dat hen helpt hun **studiedoelen** te bereiken door middel van een skill tree, currency systeem, en AI-coaching.

**Leerdoel:** Software bewerken (07.09.01) - De leerlingen bewerken software om een specifiek product te maken of om een probleem op te lossen.

---


## 👥 Team

| Naam           | Rol           |
|----------------|---------------|
| Nick Janssens  | Scrum Master  |
| Lander Smits   | Developer     |
| Tibo Cop       | Developer     |
| Sten Braet     | Developer     |

---

## 📸 Features

| Feature | Beschrijving |
|---------|-------------|
| 🌳 **Skill Tree** | 3 niveaus (Basis → Toepassen → Creëren) met elk 3 vaardigheden |
| 🪙 **Currency** | Verdien coins door opdrachten af te ronden, besteed ze in de shop |
| 👤 **Avatar** | Personaliseerbaar profiel dat meegroeit met je voortgang |
| 🤖 **AI Coach** | Slimme begeleiding die zich aanpast aan jouw niveau |
| 🛒 **Shop** | Koop level-ups, avatar-upgrades en boosts |

---

## 📁 Projectstructuur

```
Skalor/
├── .gitignore              # Git ignore regels
├── README.md               # Dit bestand
│
│
├── templates/
│   ├── index.html          # Hoofd HTML template
│   └── tree/               # HTML Files Skill Tree
│       └── biology.html
│       └── dutch.html
│       └── it.html
│       └── math.html
│       └── physics.html
│       └── science.html                      
│
└── static/
    ├── css/
    │   └── courses.css           # CSS voor Course Pages in Tree
    │   └── main.css              # Alle styling
    │   └── global_vars.css       # Variables
    │   └── index.css       
    │   └── demo.css              # CSS voor Demo Sprint 1
    ├── data/                     # Volledige inhoud files Demo Sprint 1
    │   └── bio.txt      
    ├── js/
    │   └── app_demo.js           # JS voor Demo Sprint 1
    │   └── ai_demo.js            # AI voor Demo Sprint 1
    │   └── app.js                # Client-side interactie
    └── images/                   # Afbeeldingen (voeg hier toe)
        └── Skalor_Logo.png         # Logo Image
```



## 📝 Licentie

Dit project is gemaakt als schoolopdracht voor Thomas More hogeschool.
