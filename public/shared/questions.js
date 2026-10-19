// Game metadata + shared text. The questions themselves live in banks.js.
export { BANK } from './banks.js';

// tier: chill < mild < spicy.  theme = body[data-theme] in the CSS (colours, font, background).
export const GAMES = {
  same_brain:         { engine: 'match', tier: 'chill', group: 'friends', icon: 'brain',            theme: 'same_brain',         name: 'Same Brain?',        pitch: 'Pick one. See if you think alike.' },
  hot_takes:          { engine: 'match', tier: 'chill', group: 'friends', icon: 'megaphone',        theme: 'hot_takes',          name: 'Hot Takes',          pitch: 'Agree or nope. Defend your take.' },
  know_me:            { engine: 'guess', tier: 'chill', group: 'friends', icon: 'user-round-search', theme: 'know_me',           name: 'Know Me',            pitch: 'One answers. Everyone else guesses.' },
  compatibility_quiz: { engine: 'match', tier: 'mild',  group: 'couples', icon: 'heart-handshake',  theme: 'compatibility_quiz', name: 'Compatibility Quiz', pitch: 'Deep emotional and lifestyle alignment.' },
  couple_trivia:      { engine: 'match', tier: 'mild',  group: 'couples', icon: 'target',           theme: 'couple_trivia',      name: 'Couple Trivia',      pitch: 'Basic facts and daily habits.' },
  truth_or_lie:       { engine: 'match', tier: 'spicy', group: 'couples', icon: 'drama',            theme: 'truth_or_lie',       name: 'Truth or Lie',       pitch: 'Wild confessions and secret facts.' },
  spicy_or_sweet:     { engine: 'match', tier: 'spicy', group: 'couples', icon: 'cherry',           theme: 'spicy_or_sweet',     name: 'Spicy or Sweet',     pitch: 'Strictly NSFW and intimate preferences.', nsfw: true },
};

export const ICEBREAKERS = [
  "What's the last thing that made you laugh out loud?", 'Hot take: what is the most overrated thing ever?', 'What song have you had on repeat lately?',
  'Which show could you rewatch forever?', 'What is a tiny thing that instantly makes your day better?', 'If you could teleport anywhere right now, where would you go?',
  "What's your most irrational fear?", 'What would your perfect Sunday look like?', 'Which app do you waste the most time on?',
  'What is the best food you ate this month?', "What's a skill you wish you could learn overnight?", 'Night owl or early bird? Be honest.',
  "What's the worst advice you ever got?", 'What would you do with a surprise free week?', "What's something you're weirdly good at?",
  'Which fictional world would you move to?', "What's your go-to comfort movie?", 'What is a small win you had this week?',
  'Which childhood memory still makes you smile?', "What's the most useless talent you have?", 'Best trip you ever took?',
  'Which celebrity would be your best friend?', 'What is your most unpopular opinion?', 'Describe your day in three words.',
  'What are you pretending to be good at right now?', 'What is the last thing you Googled?', 'Two truths and a lie. Go.',
  'What is your comfort snack at 2 a.m.?', 'If your life had a theme song, what would it be?', 'What is the pettiest thing that annoys you?',
];

export const INTERESTS = [
  { label: 'Music', icon: 'music' }, { label: 'Gaming', icon: 'gamepad-2' }, { label: 'Movies', icon: 'clapperboard' }, { label: 'Cricket', icon: 'trophy' },
  { label: 'Books', icon: 'book-open' }, { label: 'Coding', icon: 'code-xml' }, { label: 'Food', icon: 'utensils' }, { label: 'Travel', icon: 'plane' },
  { label: 'Art', icon: 'palette' }, { label: 'Fitness', icon: 'dumbbell' }, { label: 'Memes', icon: 'laugh' }, { label: 'Late nights', icon: 'moon-star' },
];
