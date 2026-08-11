/*
  Koi 💗 — Build 1.2 Data Layer
  Local-first static data used by app.js.
  Keep this file beside index.html, style.css and app.js.
*/

window.KOI_DATA = {
  questionPacks: [
    { id: "all", icon: "💗", label: "Everything", description: "A little bit of every Koi mood." },
    { id: "sweet", icon: "💕", label: "Sweet", description: "Affection, appreciation and tiny love notes." },
    { id: "silly", icon: "😂", label: "Silly", description: "Low-stakes chaos and ridiculous couple questions." },
    { id: "deep", icon: "🥹", label: "Deep", description: "Thoughtful questions for slower conversations." },
    { id: "future", icon: "🔮", label: "Future", description: "Dreams, plans and the life you are building." },
    { id: "food", icon: "🍜", label: "Food", description: "Because food is relationship lore." },
    { id: "memories", icon: "📷", label: "Memories", description: "Look back at the little chapters you share." },
    { id: "travel", icon: "✈️", label: "Travel", description: "Places, trips and adventures together." },
    { id: "flirty", icon: "💞", label: "Flirty", description: "Cute, affectionate and lightly flirty." },
    { id: "custom", icon: "✍️", label: "Our Questions", description: "Only questions written by the two of you." }
  ],

  questions: [
    { id: "sweet01", pack: "sweet", category: "Sweet", text: "What is one tiny thing I do that makes everyday life feel softer?" },
    { id: "sweet02", pack: "sweet", category: "Sweet", text: "When did you feel especially cared for by me this week?" },
    { id: "sweet03", pack: "sweet", category: "Sweet", text: "What is something about us you never want to take for granted?" },
    { id: "sweet04", pack: "sweet", category: "Sweet", text: "What ordinary moment with me feels strangely romantic to you?" },
    { id: "sweet05", pack: "sweet", category: "Sweet", text: "What compliment do you think I deserve to hear more often?" },
    { id: "sweet06", pack: "sweet", category: "Sweet", text: "What little habit of mine feels like home to you now?" },

    { id: "silly01", pack: "silly", category: "Silly", text: "If our relationship had a warning label, what would it say?" },
    { id: "silly02", pack: "silly", category: "Silly", text: "If I were arrested tomorrow, what would you assume I did?" },
    { id: "silly03", pack: "silly", category: "Silly", text: "Which one of us would survive longer in a zombie movie, and why?" },
    { id: "silly04", pack: "silly", category: "Silly", text: "What completely unnecessary competition would we be weirdly good at?" },
    { id: "silly05", pack: "silly", category: "Silly", text: "What food best represents my personality?" },
    { id: "silly06", pack: "silly", category: "Silly", text: "What is our most unserious recurring argument?" },

    { id: "deep01", pack: "deep", category: "Deep", text: "What do you think we have taught each other about love?" },
    { id: "deep02", pack: "deep", category: "Deep", text: "What part of our relationship feels stronger now than it did a year ago?" },
    { id: "deep03", pack: "deep", category: "Deep", text: "When do you feel most understood by me?" },
    { id: "deep04", pack: "deep", category: "Deep", text: "What is one way we handle hard days better as a team now?" },
    { id: "deep05", pack: "deep", category: "Deep", text: "What do you hope always stays gentle between us?" },
    { id: "deep06", pack: "deep", category: "Deep", text: "What kind of support from me matters most when you are overwhelmed?" },

    { id: "future01", pack: "future", category: "Future", text: "What does an ordinary happy Sunday look like for us five years from now?" },
    { id: "future02", pack: "future", category: "Future", text: "What tiny tradition would you love us to still have ten years from now?" },
    { id: "future03", pack: "future", category: "Future", text: "What is one thing you want us to learn or try together someday?" },
    { id: "future04", pack: "future", category: "Future", text: "If we could live anywhere for one month, where would you choose?" },
    { id: "future05", pack: "future", category: "Future", text: "What future version of us makes you smile when you picture it?" },
    { id: "future06", pack: "future", category: "Future", text: "What should we make more room for in our life together?" },

    { id: "food01", pack: "food", category: "Food", text: "What meal has accidentally become an ‘us’ meal?" },
    { id: "food02", pack: "food", category: "Food", text: "If we opened a tiny restaurant together, what would we serve?" },
    { id: "food03", pack: "food", category: "Food", text: "Which snack do you associate with me immediately?" },
    { id: "food04", pack: "food", category: "Food", text: "What restaurant would you happily revisit with me forever?" },
    { id: "food05", pack: "food", category: "Food", text: "What food opinion of mine is completely unacceptable?" },
    { id: "food06", pack: "food", category: "Food", text: "If tonight became an unexpected food date, what are we eating?" },

    { id: "memory01", pack: "memories", category: "Memories", text: "Which ordinary date of ours deserves more credit than it gets?" },
    { id: "memory02", pack: "memories", category: "Memories", text: "What is a tiny detail from our beginning that you still remember?" },
    { id: "memory03", pack: "memories", category: "Memories", text: "Which photo of us has a much bigger story behind it?" },
    { id: "memory04", pack: "memories", category: "Memories", text: "What moment made you think, ‘I really like doing life with this person’?" },
    { id: "memory05", pack: "memories", category: "Memories", text: "Which past version of us would you love to visit for one afternoon?" },
    { id: "memory06", pack: "memories", category: "Memories", text: "What memory still makes you laugh before you even finish telling it?" },

    { id: "travel01", pack: "travel", category: "Travel", text: "What place would you love to experience with me for the first time?" },
    { id: "travel02", pack: "travel", category: "Travel", text: "What was your favorite tiny moment from a trip we took together?" },
    { id: "travel03", pack: "travel", category: "Travel", text: "Would you rather plan every detail with me or wander and figure it out as we go?" },
    { id: "travel04", pack: "travel", category: "Travel", text: "What destination feels the most ‘us’ even if we have never been there?" },
    { id: "travel05", pack: "travel", category: "Travel", text: "What travel habit of mine makes you laugh?" },
    { id: "travel06", pack: "travel", category: "Travel", text: "If we could repeat one travel day exactly, which day would you pick?" },

    { id: "flirty01", pack: "flirty", category: "Flirty", text: "What is something I do that still gives you a tiny heart-flutter?" },
    { id: "flirty02", pack: "flirty", category: "Flirty", text: "Which outfit of mine lives in your head rent-free?" },
    { id: "flirty03", pack: "flirty", category: "Flirty", text: "What is your favorite way for me to get your attention?" },
    { id: "flirty04", pack: "flirty", category: "Flirty", text: "What kind of date makes me look especially cute to you?" },
    { id: "flirty05", pack: "flirty", category: "Flirty", text: "What is one thing about me you still catch yourself admiring?" },
    { id: "flirty06", pack: "flirty", category: "Flirty", text: "What little romantic gesture would instantly make your day?" }
  ],

  predictionPrompts: [
    { id: "p01", prompt: "What would your partner pick for a comfort-food emergency?", options: ["Ramen", "Pizza", "Fried chicken", "Dessert first"] },
    { id: "p02", prompt: "Which spontaneous plan would your partner choose?", options: ["Café hopping", "Movie night", "Long drive", "Stay home"] },
    { id: "p03", prompt: "What kind of trip would your partner book right now?", options: ["Big city", "Beach", "Mountains", "Theme park"] },
    { id: "p04", prompt: "Which gift would make your partner happiest today?", options: ["Food", "Flowers", "Something useful", "A surprise date"] },
    { id: "p05", prompt: "Your partner gets a free afternoon. What do they want most?", options: ["Nap", "Eat out", "Shop", "Go somewhere new"] },
    { id: "p06", prompt: "Which date-night mood would your partner choose?", options: ["Dress up", "Cozy", "Adventure", "Food crawl"] },
    { id: "p07", prompt: "What would your partner save first from a memory box?", options: ["Photos", "Tickets", "Letters", "Tiny souvenirs"] },
    { id: "p08", prompt: "Which weather makes your partner happiest for a date?", options: ["Sunny", "Rainy", "Cool & cloudy", "Cold"] },
    { id: "p09", prompt: "What would your partner rather receive unexpectedly?", options: ["Coffee", "Snack", "Little note", "Hug"] },
    { id: "p10", prompt: "Which part of a trip does your partner secretly enjoy most?", options: ["Planning", "Food", "Exploring", "Hotel time"] }
  ],

  loreCategories: [
    { id: "inside-joke", icon: "😂", label: "Inside Joke" },
    { id: "quote", icon: "🗯️", label: "Quote" },
    { id: "food", icon: "🍜", label: "Food Lore" },
    { id: "travel", icon: "✈️", label: "Travel Lore" },
    { id: "chaos", icon: "🫠", label: "Chaotic Moment" },
    { id: "sweet", icon: "💗", label: "Sweet Story" },
    { id: "argument", icon: "😤", label: "Former Argument" },
    { id: "other", icon: "📖", label: "Other Lore" }
  ],

  dateCategories: ["Food", "Activity", "Out", "At Home", "Outdoor", "Travel", "Culture", "Random"],
  dateBudgets: ["Free", "Cheap", "Normal", "Treat"],
  dateSettings: ["Anywhere", "At Home", "Indoor", "Outdoor"],
  dateDurations: ["30–60 min", "1–2 hours", "Half day", "Full day"],
  dateMoods: ["Cozy", "Playful", "Romantic", "Something new", "Low energy", "Adventure"],

  roomUnlocks: [
    { id: "lights", icon: "✨", label: "Fairy lights", points: 0 },
    { id: "frame", icon: "🖼️", label: "Memory frame", points: 4 },
    { id: "plant", icon: "🪴", label: "Little plant", points: 8 },
    { id: "plush", icon: "🧸", label: "Shared plush", points: 12 },
    { id: "camera", icon: "📷", label: "Camera", points: 18 },
    { id: "heart", icon: "💗", label: "Heart pillow", points: 24 },
    { id: "books", icon: "📚", label: "Lore shelf", points: 30 },
    { id: "pond", icon: "🫧", label: "Koi pond", points: 38 },
    { id: "souvenir", icon: "🎟️", label: "Keepsake shelf", points: 48 },
    { id: "moonlamp", icon: "🌙", label: "Moon lamp", points: 60 }
  ],

  littleThingCategories: ["Care", "Funny", "Thoughtful", "Support", "Food", "Everyday", "Surprise"],
  eraPresets: ["Our Beginning", "Adventure Era", "Homebody Era", "Japan Era", "Busy but Us Era", "Soft Life Era", "Chaotic Era"]
};
