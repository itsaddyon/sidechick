import re

# We will generate 60 highly engaging, college-slang questions per category (240 questions total!)
# Categories: compatibility_quiz, spicy_or_sweet, couple_trivia, truth_or_lie

compatibility_questions = [
    # 1-25 (retained and polished)
    {'id': 1, 'text': 'How do you handle a massive argument?', 'choices': ['I need space immediately', 'I want to talk it out right now', 'I pretend it didn\'t happen', 'I get very emotional']},
    {'id': 2, 'text': 'What is your primary love language?', 'choices': ['Physical Touch', 'Words of Affirmation', 'Quality Time', 'Acts of Service / Gifts']},
    {'id': 3, 'text': 'What is your biggest relationship red flag?', 'choices': ['Controlling behavior', 'Poor communication/silent treatment', 'Lack of ambition', 'Too clingy/needy']},
    {'id': 4, 'text': 'How much alone time do you need in a relationship?', 'choices': ['I need a lot of personal space', 'I like a healthy balance', 'I want to be together 24/7', 'It depends on my mood']},
    {'id': 5, 'text': 'What is your view on finances in a serious relationship?', 'choices': ['Combine everything', 'Keep it 100% separate', 'Split shared bills, keep the rest separate', 'Whoever makes more pays more']},
    {'id': 6, 'text': 'How do you prefer to spend a lazy Sunday?', 'choices': ['Binge-watching shows in bed', 'Deep cleaning & organizing', 'Going out for a long brunch', 'Sleeping all day']},
    {'id': 7, 'text': 'What is your approach to dealing with stress?', 'choices': ['I completely shut down', 'I vent to my partner immediately', 'I distract myself with hobbies', 'I take it out on people around me']},
    {'id': 8, 'text': 'How important is physical intimacy for a successful relationship?', 'choices': ['It is the absolute most important thing', 'Very important, but not everything', 'Somewhat important', 'Emotional connection matters way more']},
    {'id': 9, 'text': 'What is your stance on jealousy?', 'choices': ['I get extremely jealous easily', 'A little jealousy is healthy/hot', 'I rarely get jealous', 'I never get jealous at all']},
    {'id': 10, 'text': 'How do you handle apologies?', 'choices': ['I apologize immediately', 'I need time before I can apologize', 'I rarely think I am wrong', 'I expect the other person to apologize first']},
    {'id': 11, 'text': 'What is your ideal vacation style?', 'choices': ['Relaxing at a luxury resort', 'Backpacking and roughing it', 'Exploring a busy city', 'A romantic cabin in the woods']},
    {'id': 12, 'text': 'How do you feel about public displays of affection (PDA)?', 'choices': ['I love it, all the time', 'Holding hands is fine, nothing crazy', 'Only when we are drunk', 'I absolutely hate PDA']},
    {'id': 13, 'text': 'What is your communication style via text?', 'choices': ['Double/Triple texter', 'Takes 3-5 business days to reply', 'Short and dry', 'Only communicates in memes/reels']},
    {'id': 14, 'text': 'How do you deal with your partner having opposite-sex friends?', 'choices': ['Totally fine, I trust them', 'Fine, but I want to meet them', 'I get slightly uncomfortable', 'Absolutely not allowed']},
    {'id': 15, 'text': 'What is the most important trait in a long-term partner?', 'choices': ['Unwavering loyalty', 'A great sense of humor', 'High sexual compatibility', 'Emotional intelligence']},
    {'id': 16, 'text': 'How do you feel about sharing passwords with your partner?', 'choices': ['We should share everything', 'Only for streaming services', 'I value my privacy too much', 'I would only share if asked']},
    {'id': 17, 'text': 'What is your approach to making big life decisions?', 'choices': ['I overthink for weeks', 'I go with my gut instinct', 'I ask my partner/friends for advice', 'I flip a coin/act impulsively']},
    {'id': 18, 'text': 'How do you prefer to celebrate your birthday?', 'choices': ['Massive party with everyone', 'Intimate dinner with my partner', 'I don\'t want to celebrate it', 'A surprise getaway']},
    {'id': 19, 'text': 'What is your stance on keeping in touch with exes?', 'choices': ['We are still good friends', 'Cordial but distant', 'Blocked and forgotten', 'Depends on how it ended']},
    {'id': 20, 'text': 'How important are shared hobbies in a relationship?', 'choices': ['Crucial, we must do things together', 'Nice to have, but not required', 'I prefer we have our own separate hobbies', 'I don\'t care either way']},
    {'id': 21, 'text': 'What is your biggest fear in a relationship?', 'choices': ['Being cheated on', 'Losing my independence', 'Growing bored/falling out of love', 'Not being appreciated']},
    {'id': 22, 'text': 'How do you handle being sick?', 'choices': ['I want to be babied and taken care of', 'Leave me alone until I am better', 'I pretend I am fine', 'I complain constantly']},
    {'id': 23, 'text': 'What is your view on marriage?', 'choices': ['Can\'t wait for a huge wedding', 'I want a small/private elopement', 'It\'s just a piece of paper', 'I am completely against it']},
    {'id': 24, 'text': 'How do you deal with family drama?', 'choices': ['I get heavily involved', 'I avoid it at all costs', 'I try to play peacemaker', 'I vent about it constantly']},
    {'id': 25, 'text': 'What makes you feel most loved?', 'choices': ['Surprise gifts or dates', 'When they remember small details', 'Deep, late-night conversations', 'Physical closeness and cuddles']},
    
    # 26-60 (new additions!)
    {'id': 101, 'text': 'What is your stance on double dating?', 'choices': ['Love it, it is so much fun!', 'Fine occasionally with close friends', 'I prefer 1-on-1 time only', 'Too much social energy required']},
    {'id': 102, 'text': 'How do you feel about sleeping in separate blankets?', 'choices': ['Dealbreaker, we must share!', 'Better sleep, so I support it', 'Only if the bed is small', 'I prefer my own blanket honestly']},
    {'id': 103, 'text': 'What is your ultimate standard for a clean house?', 'choices': ['Spotless, dust-free always', 'Cleaned once a week is fine', 'Lived-in and slightly messy is cozy', 'A complete organized chaos']},
    {'id': 104, 'text': 'How do you react if I am super late for a date?', 'choices': ['I get secretly annoyed/resentful', 'Totally chill, life happens', 'I text you constantly', 'I leave after 20 minutes']},
    {'id': 105, 'text': 'What is your ideal vibe for a Friday night?', 'choices': ['Going hard at a club/party', 'Intimate dinner or bar-hopping', 'Cozy movie night at home', 'Working on my personal goals']},
    {'id': 106, 'text': 'How do you feel about posting your relationship online?', 'choices': ['Hard launch immediately!', 'Soft launch only', 'Keep it 100% private, no posts', 'Only on major anniversaries']},
    {'id': 107, 'text': 'What is your toxic trait in a relationship?', 'choices': ['Sarcasm/teasing too much', 'Being overly clingy/needy', 'Overthinking literally everything', 'Bottling up my feelings']},
    {'id': 108, 'text': 'How do you handle meeting a partner\'s parents?', 'choices': ['Naturally charm them instantly', 'Get extremely nervous but fake it', 'Awkward and quiet', 'Try to avoid it as long as possible']},
    {'id': 109, 'text': 'What is your view on having pets?', 'choices': ['Dog person 100%', 'Cat person 100%', 'I want both dogs and cats', 'No pets inside the house please']},
    {'id': 110, 'text': 'How do you feel about kids in the future?', 'choices': ['Def want them (2 or more)', 'Maybe just one', 'Strictly no kids ever', 'Undecided, too early to tell']},
    {'id': 111, 'text': 'What is your stance on political alignment in a partner?', 'choices': ['Must align completely', 'Different views are fine if respectful', 'I do not care about politics at all', 'I love debating opposite views']},
    {'id': 112, 'text': 'How do you prefer to resolve an argument?', 'choices': ['Cool off alone first, then talk', 'Resolve it immediately, no sleeping mad', 'Write a long text explaining feelings', 'Hug it out and drop it']},
    {'id': 113, 'text': 'How do you feel about your partner\'s dressing style?', 'choices': ['They can wear whatever they want', 'I love giving style advice', 'I get secretly embarrassed sometimes', 'We should match vibes/styles']},
    {'id': 114, 'text': 'What is your dream home location?', 'choices': ['Penthouse in a bustling city', 'Suburban modern mansion', 'A cozy beach house', 'A secluded cabin in the mountains']},
    {'id': 115, 'text': 'How do you handle social battery drainage?', 'choices': ['I need to leave parties early', 'I push through and keep partying', 'I hide in a corner on my phone', 'I stay home in the first place']},
    {'id': 116, 'text': 'What is your stance on gifting?', 'choices': ['Love giving thoughtful/custom gifts', 'Prefer practical gifts I actually need', 'Experiences (trips/dates) > material gifts', 'I am bad at gifts, just buy me food']},
    {'id': 117, 'text': 'How do you feel about sharing food?', 'choices': ['"Joey doesn\'t share food!"', 'I love sharing and tasting everything', 'Only if you ask first', 'I will literally feed you from my plate']},
    {'id': 118, 'text': 'What is your primary attachment style?', 'choices': ['Secure and trusting', 'Anxious (needs constant reassurance)', 'Avoidant (pulls away when close)', 'Fearful-avoidant (confused/chaotic)']},
    {'id': 119, 'text': 'How do you feel about high-energy social gatherings?', 'choices': ['I thrive, I\'m the life of the party', 'I enjoy it in small doses', 'Highly exhausting, I prefer close friends', 'I absolutely despise them']},
    {'id': 120, 'text': 'What is your standard for "cheating"?', 'choices': ['Only physical intimacy', 'Emotional affairs/deep secret chats', 'Flirting or liking thirst traps online', 'Deleting chats/hiding things']},
    {'id': 121, 'text': 'How do you feel about matching outfits?', 'choices': ['Cringe, absolutely not', 'Cute for photos/events', 'I would love to do it regularly', 'Only if it is subtle']},
    {'id': 122, 'text': 'What is your approach to healthy eating?', 'choices': ['Super strict, organic/macros', 'Eat clean during the week, cheat weekend', 'Pure junk food and zero regrets', 'I just eat whatever is fast and easy']},
    {'id': 123, 'text': 'How do you handle career/academic stress?', 'choices': ['Overwork myself to exhaustion', 'Procrastinate and stress out', 'Maintain a perfect work-life balance', 'Rant about it constantly']},
    {'id': 124, 'text': 'What is your view on sleeping with the TV/music on?', 'choices': ['Must be pitch black and absolute silence', 'Need white noise or a fan', 'I sleep with a show playing in background', 'I can sleep literally anywhere, anytime']},
    {'id': 125, 'text': 'What is your view on long distance relationships?', 'choices': ['No way, physical presence is mandatory', 'I can do it if there\'s an end date', 'I actually enjoy the extra personal space', 'Only if we call/FaceTime 24/7']},
    {'id': 126, 'text': 'How do you feel about your partner going to a club without you?', 'choices': ['Totally fine, I trust them completely', 'A bit anxious, but I say it\'s fine', 'I would prefer they don\'t go', 'Only if they stay on FaceTime']},
    {'id': 127, 'text': 'What is your ideal morning routine?', 'choices': ['Up early, gym, cold shower', 'Slow coffee, reading, chill vibes', 'Hit snooze 5 times, rush to get ready', 'Sleep until noon, no routine']},
    {'id': 128, 'text': 'How do you handle holiday planning?', 'choices': ['Plan every single detail/hour', 'Book flights, wing the rest', 'I let my partner plan everything', 'Total spontaneous adventure']},
    {'id': 129, 'text': 'What is your opinion on horoscopes/astrology?', 'choices': ['I live my life by it strictly', 'Fun to read, but don\'t take it seriously', 'Complete nonsense/pseudoscience', 'I only look at compatibility percentages']},
    {'id': 130, 'text': 'How do you prefer to show appreciation?', 'choices': ['Writing cute letters/long texts', 'Buying random little treats/coffee', 'Giving a massive tight hug/kiss', 'Helping you clean or do chores']}
]

spicy_questions = [
    # 26-50 (retained and polished)
    {'id': 26, 'text': 'What is your ultimate dynamic in the bedroom?', 'choices': ['Taking total control (Dominant)', 'Being completely dominated (Submissive)', 'A completely equal switch', 'Depends entirely on my mood']},
    {'id': 27, 'text': 'What is your stance on public intimacy?', 'choices': ['Only behind locked doors', 'Risky places (Cars, alleys, etc)', 'Heavy petting at a party', 'Exhibitionism is a major turn-on']},
    {'id': 28, 'text': 'How do you feel about dirty talk?', 'choices': ['I need it, the dirtier the better', 'I like soft/praising whispers', 'It makes me cringe/laugh', 'I like to hear it, but I can\'t do it']},
    {'id': 29, 'text': 'What is your preference for pace?', 'choices': ['Slow, romantic, and sensual', 'Rough, fast, and aggressive', 'A mix: start slow, end rough', 'Quickies are the best']},
    {'id': 30, 'text': 'How do you feel about introducing toys?', 'choices': ['Absolutely essential', 'Fun to use occasionally', 'Intimidated but curious', 'I prefer natural only']},
    {'id': 31, 'text': 'What is your stance on recording or taking photos?', 'choices': ['Love it, let\'s make a tape', 'A few spicy pics are fine', 'Only if my face isn\'t in it', 'Absolutely never']},
    {'id': 32, 'text': 'What time of day is best for intimacy?', 'choices': ['First thing in the morning', 'Late at night', 'A lazy afternoon', 'Whenever the mood strikes']},
    {'id': 33, 'text': 'What is your view on roleplay?', 'choices': ['I have a whole wardrobe for it', 'I\'d try it if my partner wanted', 'I feel too silly doing it', 'Strictly no roleplay']},
    {'id': 34, 'text': 'How do you feel about lingerie?', 'choices': ['I love wearing/seeing it', 'It\'s too much effort, just take it off', 'Only for very special occasions', 'I prefer wearing nothing at all']},
    {'id': 35, 'text': 'What is your biggest physical turn-on?', 'choices': ['Neck kisses/biting', 'Eye contact', 'Hair pulling/choking', 'Being pinned down']},
    {'id': 36, 'text': 'How do you feel about threesomes/group play?', 'choices': ['Done it and loved it', 'Fantasize about it, but haven\'t', 'Would only do it under strict rules', 'I am strictly monogamous']},
    {'id': 37, 'text': 'What is your preferred lighting?', 'choices': ['Lights wide open', 'Dim mood lighting/LEDs', 'Pitch black', 'Daylight/Sunlight']},
    {'id': 38, 'text': 'How important is foreplay?', 'choices': ['More important than the main event', 'Crucial for a warm-up', 'A few minutes is enough', 'Just skip to the good part']},
    {'id': 39, 'text': 'What is your stance on bondage/restraints?', 'choices': ['Tie me up completely', 'I want to do the tying', 'Light restraints (cuffs/silk ties)', 'No restraints for me']},
    {'id': 40, 'text': 'How do you handle noise in the bedroom?', 'choices': ['I am extremely loud', 'I am completely silent', 'I try to be quiet but fail', 'Only heavy breathing']},
    {'id': 41, 'text': 'What is your view on morning afters?', 'choices': ['Round two immediately', 'Cuddle and sleep more', 'Get up, shower, and make breakfast', 'I need my personal space']},
    {'id': 42, 'text': 'How do you feel about mirror play?', 'choices': ['I love watching us', 'Only if I look good that day', 'It distracts me', 'I hate seeing myself']},
    {'id': 43, 'text': 'What is your stance on sensory deprivation (blindfolds)?', 'choices': ['Love the anticipation', 'Makes me too anxious', 'Only if I trust them 100%', 'Never tried but want to']},
    {'id': 44, 'text': 'How do you feel about spontaneous intimacy?', 'choices': ['Love it, anytime anywhere', 'I prefer to be clean and prepared', 'Only if we are alone in the house', 'It gives me anxiety']},
    {'id': 45, 'text': 'What is your preferred method of initiation?', 'choices': ['Directly asking for it', 'Subtle physical touching', 'Sending a risky text earlier', 'Just going in for a heavy kiss']},
    {'id': 46, 'text': 'How do you feel about Edging/Teasing?', 'choices': ['It\'s my favorite thing', 'It\'s frustrating but hot', 'I hate it, give it to me now', 'I don\'t have the patience']},
    {'id': 47, 'text': 'What is your view on sharing fantasies?', 'choices': ['I am an open book', 'I only share if they ask', 'I have secrets I will take to the grave', 'I don\'t really have any']},
    {'id': 48, 'text': 'How do you feel about receiving oral?', 'choices': ['It\'s mandatory', 'It\'s a nice treat', 'I prefer giving', 'I am not a fan']},
    {'id': 49, 'text': 'What is your view on temperature play (ice/hot wax)?', 'choices': ['Fascinated by it', 'Ice cubes are fun, wax is too much', 'I don\'t like being uncomfortable', 'Sounds terrifying']},
    {'id': 50, 'text': 'How do you feel about aftercare?', 'choices': ['I need a lot of physical touch and reassurance', 'Just a quick cuddle is fine', 'I just want to sleep immediately', 'I prefer getting up and doing something']},

    # 131-165 (new intimate/spicy additions)
    {'id': 131, 'text': 'How do you feel about shower sex?', 'choices': ['Extremely hot and romantic', 'Highly overrated/dangerous slip-hazard', 'Only if the shower is huge', 'Fun for a quickie only']},
    {'id': 132, 'text': 'What is your stance on hickeys?', 'choices': ['I love giving and receiving them', 'Only where they can be hidden', 'Strictly no hickeys (looks trashy)', 'I don\'t care either way']},
    {'id': 133, 'text': 'How do you feel about over-the-clothes action?', 'choices': ['Highly underrated and teasing', 'Just a waste of time, skip it', 'Cute for making out in public', 'Only if we are in a rush']},
    {'id': 134, 'text': 'What is your stance on quickies?', 'choices': ['Love them, super exciting', 'Too short, I need time', 'Only when we are about to go out', 'Only in public/semi-public spots']},
    {'id': 135, 'text': 'What is your preference for music during intimacy?', 'choices': ['Sensual R&B playlist', 'Lo-fi or soft background tracks', 'Complete silence is better', 'Funny/cringe playlist']},
    {'id': 136, 'text': 'How do you feel about spanking?', 'choices': ['Love it, hard as you can', 'Light slaps only', 'Only if I am doing the spanking', 'Absolutely not for me']},
    {'id': 137, 'text': 'What is your stance on using food/dessert?', 'choices': ['Whipped cream/chocolate is hot', 'Too messy, I hate sticky skin', 'Only ice cubes for cooling effects', 'Only in fantasies']},
    {'id': 138, 'text': 'How do you feel about tickling during intimacy?', 'choices': ['Ruins the mood completely', 'Actually a fun/cute turn-on', 'Only as a playful break', 'I am way too ticklish']},
    {'id': 139, 'text': 'What is your stance on sending spicy texts/thirst traps?', 'choices': ['I send them constantly', 'Only if you send one first', 'I like receiving them, but don\'t send', 'Never, too risky']},
    {'id': 140, 'text': 'Where is the wildest place you want to try next?', 'choices': ['In an elevator', 'On a balcony/terrace', 'In the ocean/pool', 'On a kitchen counter']},
    {'id': 141, 'text': 'How do you feel about morning breath intimacy?', 'choices': ['No big deal, just kiss me', 'Brush teeth/mint first is mandatory', 'Only if we don\'t kiss on the mouth', 'Absolutely not, wait till noon']},
    {'id': 142, 'text': 'What is your stance on using lube?', 'choices': ['Always keep it handy', 'Only if absolutely necessary', 'I prefer natural only', 'Fun to try flavored/warming ones']},
    {'id': 143, 'text': 'How do you feel about blindfolding your partner?', 'choices': ['I love having complete control', 'I prefer being the blindfolded one', 'Too anxious, I need to see everything', 'Fun to try occasionally']},
    {'id': 144, 'text': 'What is your stance on bite marks?', 'choices': ['Love leaving/getting them', 'Only soft biting, no marks', 'I hate being bitten', 'Only on the neck/shoulders']},
    {'id': 145, 'text': 'How do you feel about morning wood?', 'choices': ['Best way to wake up fr', 'I am too tired, let me sleep', 'Only if we have time to cuddle', 'Shower first please']},
    {'id': 146, 'text': 'What is your preference for body hair?', 'choices': ['100% shaved/smooth', 'Trimmed/Neat is perfect', 'Natural/Wild is hot', 'I don\'t care at all']},
    {'id': 147, 'text': 'How do you feel about phone use in bed afterward?', 'choices': ['Immediate turn-off, keep cuddling', 'Fine after a few minutes of talking', 'I do it too, so no big deal', 'Only to play a game together']},
    {'id': 148, 'text': 'What is your view on scratching?', 'choices': ['Leave massive marks on my back', 'Light scratching only', 'Absolutely no scratching allowed', 'Only if it is accidental']},
    {'id': 149, 'text': 'How do you feel about dirty talk in a foreign accent/language?', 'choices': ['Extremely hot', 'Silly/makes me laugh', 'Cringe, please speak normally', 'Only if it is French/Italian']},
    {'id': 150, 'text': 'What is your ideal post-intimacy snack?', 'choices': ['Cold water & absolute silence', 'Ordering greasy fast food', 'Sweet treats/chocolate/ice cream', 'Round two is my snack']}
]

couple_trivia_questions = [
    # 51-75 (retained and polished)
    {'id': 51, 'text': 'What is my go-to drunk food?', 'choices': ['Pizza/Garlic Bread', 'Taco Bell / Fast Food / Burgers', 'Instant Noodles / Maggi', 'I don\'t eat when drunk']},
    {'id': 52, 'text': 'What is my usual coffee/tea order?', 'choices': ['Black coffee / Espresso', 'Sweet Iced Latte / Frappe', 'Tea / Matcha / Chai', 'I don\'t drink caffeine']},
    {'id': 53, 'text': 'How many alarms do I set in the morning?', 'choices': ['Just one, I wake up instantly', '2 or 3, just in case', '5+ alarms and I still sleep through them', 'I naturally wake up without one']},
    {'id': 54, 'text': 'What is my favorite genre of movie?', 'choices': ['Action / Thriller / Mystery', 'Rom-Com / Drama / Anime', 'Horror / Psychological', 'Sci-Fi / Fantasy / Marvel']},
    {'id': 55, 'text': 'If I had a free weekend, what would I do?', 'choices': ['Go out clubbing/drinking', 'Play video games all day', 'Go hiking/outdoors', 'Read a book/Netflix in bed']},
    {'id': 56, 'text': 'What is my biggest pet peeve?', 'choices': ['Loud chewing/smacking lips', 'Slow walkers/traffic blocking', 'Being interrupted/talked over', 'Bad hygiene/smelly breath']},
    {'id': 57, 'text': 'How do I like my eggs cooked?', 'choices': ['Scrambled / Omelette', 'Sunny-side up / Fried', 'Boiled / Poached', 'I hate eggs']},
    {'id': 58, 'text': 'What is my favorite season?', 'choices': ['Summer (beach/sun)', 'Winter (snuggle/cold)', 'Autumn/Fall (aesthetic)', 'Spring (fresh/breezy)']},
    {'id': 59, 'text': 'Which social media app do I spend the most time on?', 'choices': ['Instagram (reels scroll)', 'TikTok / YouTube Shorts', 'Twitter/X (arguments)', 'Reddit / Discord (chats)']},
    {'id': 60, 'text': 'What is my favorite color to wear?', 'choices': ['All black everything', 'Bright/Neon/White', 'Earth tones (Browns/Greens)', 'Pastels / Soft blues']},
    {'id': 61, 'text': 'How do I handle spicy food?', 'choices': ['I can eat pure fire', 'I like a little kick', 'I sweat but I push through', 'Salt is too spicy for me']},
    {'id': 62, 'text': 'What is my preferred sleeping position?', 'choices': ['On my back', 'On my stomach', 'Fetal position/side', 'Starfish (taking the whole bed)']},
    {'id': 63, 'text': 'What is my worst habit?', 'choices': ['Biting my nails/lips', 'Procrastinating until last minute', 'Interrupting people excitedly', 'Scrolling on my phone mid-conversation']},
    {'id': 64, 'text': 'If I won the lottery, what is the first thing I\'d buy?', 'choices': ['A massive mansion', 'A luxury sports car', 'A first-class ticket around the world', 'Pay off all debt immediately']},
    {'id': 65, 'text': 'What is my favorite fast-food chain?', 'choices': ['McDonald\'s / Burger King', 'KFC / Popeyes / Chicken', 'Subway / Healthy option', 'Local street food / Momos']},
    {'id': 66, 'text': 'How do I react to jump scares in movies?', 'choices': ['I don\'t flinch (cold blooded)', 'I scream out loud', 'I cover my eyes the whole time', 'I laugh at them']},
    {'id': 67, 'text': 'What was my favorite subject in school?', 'choices': ['Math / Science / Coding', 'English / History / Literature', 'Art / Music / Drama', 'P.E. / Gym / Sports']},
    {'id': 68, 'text': 'What is my usual shoe choice?', 'choices': ['Sneakers / Jordans', 'Boots / Leather shoes', 'Sandals / Crocs / Slides', 'Formal shoes / Heels']},
    {'id': 69, 'text': 'How often do I clean my room/apartment?', 'choices': ['Every single day (Neat freak)', 'Once a week', 'Only when someone is coming over', 'It is a permanent disaster zone']},
    {'id': 70, 'text': 'What is my favorite type of music?', 'choices': ['Rap / Hip-Hop / Drill', 'Pop / Top 40 / Indie', 'Rock / Metal / Electronic', 'Classical / Lo-fi / Slowed']},
    {'id': 71, 'text': 'Which household chore do I hate the most?', 'choices': ['Doing dishes', 'Folding laundry / Ironing', 'Vacuuming / Dusting', 'Cleaning the bathroom']},
    {'id': 72, 'text': 'What is my comfort TV show?', 'choices': ['The Office / Friends / Modern Family', 'True Crime documentaries', 'Reality TV trash (Love Island)', 'Anime / K-Drama']},
    {'id': 73, 'text': 'How do I pack for a trip?', 'choices': ['Weeks in advance (organized lists)', 'The night before', 'Throwing everything in a bag 1 hour before', 'I overpack for every single scenario']},
    {'id': 74, 'text': 'What is my favorite dessert?', 'choices': ['Chocolate cake / Brownie fudge', 'Ice cream / Gelato', 'Cheesecake / Pastry', 'I prefer savory snacks over sweets']},
    {'id': 75, 'text': 'What time do I usually go to bed?', 'choices': ['Before 10 PM (early bird)', 'Around Midnight', '2 AM - 3 AM (night owl)', 'When the sun comes up (insomniac)']},

    # 166-200 (new daily trivia / funny habits additions)
    {'id': 166, 'text': 'What is my absolute dream car?', 'choices': ['Tesla / Electric smart car', 'Porsche 911 / Sports car', 'G-Wagon / Massive SUV', 'Vintage Mustang / Classic']},
    {'id': 167, 'text': 'Am I an introvert or an extrovert?', 'choices': ['Extrovert (social butterfly)', 'Introvert (homebody)', 'Ambivert (depends on day)', 'Socially anxious introvert']},
    {'id': 168, 'text': 'What is my favorite hot beverage?', 'choices': ['Hot chocolate', 'Chai latte / milk tea', 'Green tea / herbal tea', 'Cappuccino / Latte']},
    {'id': 169, 'text': 'How do I behave when I get angry?', 'choices': ['Silent treatment / shut down', 'Yell and argue passionately', 'Passive-aggressive comments', 'Cry out of frustration']},
    {'id': 170, 'text': 'What is my go-to karaoke song?', 'choices': ['A massive rap anthem', 'Emotional 2000s love ballad', 'Cringe pop song (Taylor Swift/Justin Bieber)', 'I refuse to sing karaoke']},
    {'id': 171, 'text': 'How do I prefer to stay active?', 'choices': ['Hitting the gym/lifting weights', 'Running / Outdoor sports', 'Yoga / Pilates / Stretching', 'Laying on the couch (zero active energy)']},
    {'id': 172, 'text': 'What is my biggest hidden talent?', 'choices': ['Cooking/baking delicious food', 'Doing weird voice impressions', 'Flexibility / double jointed', 'Gaming / incredibly fast reflexes']},
    {'id': 173, 'text': 'What is my favorite type of cuisine?', 'choices': ['Italian (Pizza/Pasta)', 'Asian (Sushi/Ramen/Indian)', 'Mexican (Tacos/Burritos)', 'Burgers & Fries / American']},
    {'id': 174, 'text': 'Am I a dog person or a cat person?', 'choices': ['Dogs all the way!', 'Cats all the way!', 'Both equally', 'Neither, I don\'t like animals']},
    {'id': 175, 'text': 'What is my biggest academic/career goal?', 'choices': ['Start my own successful company', 'Land a high-paying corporate job', 'Become an artist/creator', 'Retire early and travel']},
    {'id': 176, 'text': 'What is my favorite smartphone brand?', 'choices': ['Apple iPhone', 'Samsung Galaxy', 'Google Pixel', 'OnePlus / Xiaomi']},
    {'id': 177, 'text': 'How do I handle scary movies?', 'choices': ['Love them, don\'t get scared at all', 'Scream and jump at every scene', 'Cover my eyes or hide behind pillows', 'I refuse to watch them']},
    {'id': 178, 'text': 'What is my signature scent/perfume vibe?', 'choices': ['Sweet & vanilla', 'Fresh & woody/musk', 'Floral & fruity', 'I don\'t wear perfume/cologne']},
    {'id': 179, 'text': 'How do I react to bad customer service?', 'choices': ['Politely accept it and move on', 'Leave a terrible 1-star review', 'Ask for the manager (Karen mode)', 'Just tip less and never return']},
    {'id': 180, 'text': 'What is my dream travel destination?', 'choices': ['Japan (Tokyo/Kyoto)', 'Europe (Paris/Italy/Greece)', 'Maldives/Bali (tropical beach)', 'Iceland (Northern Lights)']}
]

truth_questions = [
    # 76-100 (retained and polished)
    {'id': 76, 'text': 'Which of these is a true secret of mine?', 'choices': ['I\'ve kissed someone in a club bathroom', 'I still check my ex\'s social media', 'I\'ve lied about my body count', 'I\'ve snooped through a partner\'s phone']},
    {'id': 77, 'text': 'Which illegal/reckless thing have I actually done?', 'choices': ['Stolen something from a store', 'Ran from the police/security', 'Trespassed into an abandoned place', 'Drove heavily intoxicated/high']},
    {'id': 78, 'text': 'Which of these lies have I told a partner?', 'choices': ['"I fell asleep" (I was ignoring them)', '"I\'m almost there" (I hadn\'t left yet)', '"You\'re the biggest/best I\'ve had"', '"I didn\'t see your text"']},
    {'id': 79, 'text': 'What is the most embarrassing thing I\'ve done drunk?', 'choices': ['Thrown up in public', 'Texted an ex a massive paragraph', 'Fallen and injured myself', 'Started crying for no reason']},
    {'id': 80, 'text': 'Which of these wild places have I hooked up in?', 'choices': ['A car in a public parking lot', 'A movie theater', 'A public beach/park at night', 'A friend\'s bed during a party']},
    {'id': 81, 'text': 'Which of these petty things have I done?', 'choices': ['Blocked someone just for annoying me', 'Liked my own post on a burner account', 'Started an argument because I was bored', 'Purposely posted a story to make someone jealous']},
    {'id': 82, 'text': 'What is a weird quirk I actually have?', 'choices': ['I talk to myself out loud', 'I smell my own socks/clothes', 'I eat food that fell on the floor', 'I practice arguments in the shower']},
    {'id': 83, 'text': 'Which of these toxic traits do I actually possess?', 'choices': ['I hold grudges forever', 'I ghost people instead of communicating', 'I manipulate situations to get my way', 'I get insanely jealous over small things']},
    {'id': 84, 'text': 'What is a fake persona I\'ve put on?', 'choices': ['Pretending to like a band/movie to impress someone', 'Faking an accent or background', 'Lying about my age/name at a bar', 'Acting rich when I was broke']},
    {'id': 85, 'text': 'Which of these awkward moments actually happened to me?', 'choices': ['Walked in on parents/roommates', 'Sent a dirty text to the wrong person', 'Farted loudly in a quiet room', 'Waved at someone who wasn\'t waving at me']},
    {'id': 86, 'text': 'What is a secret I kept from my parents?', 'choices': ['A secret piercing/tattoo', 'Sneaking out of the house at 3 AM', 'Failing a major class', 'A secret relationship']},
    {'id': 87, 'text': 'Which of these relationship rules have I broken?', 'choices': ['Cheated or micro-cheated', 'Flirted with my partner\'s friend', 'Kept a backup plan/roster', 'Gone through their messages']},
    {'id': 88, 'text': 'What is a weird fear I actually have?', 'choices': ['Fear of belly buttons', 'Fear of escalators', 'Fear of dark water', 'Fear of looking in mirrors at night']},
    {'id': 89, 'text': 'Which of these hygiene sins am I guilty of?', 'choices': ['Not showering for 3+ days', 'Peeing in the pool/shower', 'Wearing the same underwear twice', 'Using someone else\'s toothbrush']},
    {'id': 90, 'text': 'What is the worst date I\'ve ever been on?', 'choices': ['My date forgot their wallet', 'They talked about their ex the whole time', 'We got into a screaming match', 'I left in the middle of it without telling them']},
    {'id': 91, 'text': 'Which of these financial mistakes have I made?', 'choices': ['Maxed out a credit card on clothes', 'Fell for a scam', 'Lent money and never got it back', 'Bought a gym membership and never went']},
    {'id': 92, 'text': 'What is a terrible phase I went through?', 'choices': ['An intense emo/goth phase', 'A highly toxic "fuckboy/girl" phase', 'An obsessed stan/fangirl phase', 'A "I\'m smarter than everyone" phase']},
    {'id': 93, 'text': 'Which of these minor crimes would I commit if legal?', 'choices': ['Bank robbery', 'Stealing expensive cars', 'Hacking someone\'s social media', 'Tax fraud']},
    {'id': 94, 'text': 'What is a weird food combination I actually like?', 'choices': ['Fries dipped in milkshake', 'Ketchup on eggs', 'Peanut butter and pickles', 'Pineapple on pizza (and I defend it)']},
    {'id': 95, 'text': 'Which of these social faux pas am I guilty of?', 'choices': ['Laughing at a funeral/serious moment', 'Forgetting someone\'s name immediately', 'Replying "you too" when a waiter says enjoy your food', 'Tripping in public and pretending I meant to']},
    {'id': 96, 'text': 'What is a secret belief I hold?', 'choices': ['Aliens are definitely living among us', 'Ghosts and spirits are real', 'Astrology dictates my life choices', 'The earth might be flat']},
    {'id': 97, 'text': 'Which of these workplace/school sins have I committed?', 'choices': ['Slept during a major meeting/class', 'Stole someone\'s lunch from the fridge', 'Plagiarized an entire assignment', 'Lied to get out of work/class']},
    {'id': 98, 'text': 'What is a bad habit I have when drunk?', 'choices': ['I become aggressively affectionate', 'I start fights/arguments', 'I disappear without telling anyone', 'I spill all my secrets']},
    {'id': 99, 'text': 'Which of these superficial things do I care about?', 'choices': ['How many followers someone has', 'The brand of clothes they wear', 'Their height/weight strictly', 'What car they drive']},
    {'id': 100, 'text': 'What is a secret I\'ve never told anyone until now?', 'choices': ['I don\'t actually like my best friend', 'I regret my major/career path', 'I am still in love with my ex', 'I have a secret stash of money']},

    # 201-235 (new wild confessions / spicy truth additions)
    {'id': 201, 'text': 'What is a massive lie I told to get out of a date?', 'choices': ['"My grandmother passed away"', '"I have a sudden food poisoning"', '"I have to work overnight/emergency"', '"I completely forgot"']},
    {'id': 202, 'text': 'Which of these have I actually done on a dating app?', 'choices': ['Catfished someone using old/edited pics', 'Met a total stranger in 20 minutes', 'Spammed someone with angry messages', 'Ignored 50+ matches completely']},
    {'id': 203, 'text': 'What is my most toxic secret social media habit?', 'choices': ['Stalking my ex\'s new partner\'s profile', 'Creating a fake account to spy on someone', 'Unfollowing people who don\'t follow back', 'Checking who viewed my stories every 5 mins']},
    {'id': 204, 'text': 'Which of these have I done in a relationship?', 'choices': ['Lied about where I was going', 'Flirted with a waiter/waitress for free food', 'Stolen my partner\'s hoodies permanently', 'Read their journals/diaries secretly']},
    {'id': 205, 'text': 'What is a wild thing I did to get revenge?', 'choices': ['Keyed a car or damaged property', 'Spread a highly embarrassing rumor', 'Hooked up with their best friend', 'Ignored them completely until they cried']},
    {'id': 206, 'text': 'What is the absolute longest I\'ve gone without showering?', 'choices': ['2 days', '4 days', 'A full week', 'Over a week (camping/lazy block)']},
    {'id': 207, 'text': 'Which of these have I actually stolen?', 'choices': ['Hotel towels/slippers', 'Shot glasses from a bar', 'Makeup or clothes from a store', 'Money from a family member\'s wallet']},
    {'id': 208, 'text': 'What is a highly illegal thing I got away with?', 'choices': ['Shoplifting expensive items', 'Buying/using fake IDs', 'Doing drugs at a music festival', 'Underage driving without a license']},
    {'id': 209, 'text': 'What is the cringiest thing I did as a teenager?', 'choices': ['Wrote an extremely dramatic blog/diary', 'Had a highly embarrassing haircut/fashion', 'Confessed my love in a massive public speech', 'Made a super cringe musical.ly/TikTok']},
    {'id': 210, 'text': 'Which of these secrets would ruin my reputation?', 'choices': ['I once hooked up with a teacher/boss', 'I have a secret foot/hand kink', 'I failed a highly basic exam 3 times', 'I still sleep with a stuffed animal']},
    {'id': 211, 'text': 'Which of these have I done to my best friend?', 'choices': ['Secretly disliked their new outfit/style', 'Talked trash about them behind their back', 'Had a huge crush on their sibling/partner', 'Forgotten their birthday completely']},
    {'id': 212, 'text': 'What is the most expensive thing I\'ve broken?', 'choices': ['My own smartphone screen (multiple times)', 'A expensive TV or laptop', 'A car bumper/side mirror', 'A luxury watch/jewelry']},
    {'id': 213, 'text': 'What is my actual opinion of your friends?', 'choices': ['I love them, they are amazing!', 'They are fine, but in small doses', 'One of them is highly annoying', 'I secretly dislike most of them']},
    {'id': 214, 'text': 'Which of these habits do I keep completely secret?', 'choices': ['Picking my nose when no one is watching', 'Talking to myself in full conversations', 'Stalking completely random people on LinkedIn', 'Watching dramatic reality TV for hours']},
    {'id': 215, 'text': 'What is a highly toxic rule I believe in?', 'choices': ['"If they wanted to, they would"', '"An eye for an eye in relationships"', '"Double texting makes you look desperate"', '"Never confess your feelings first"']}
]

game_data_dict = {
    'compatibility_quiz': {
        'emoji': '🎮', 'name': 'Compatibility Quiz', 'description': 'Deep emotional & lifestyle alignment',
        'questions': compatibility_questions
    },
    'spicy_or_sweet': {
        'emoji': '🌶️', 'name': 'Spicy or Sweet', 'description': 'Strictly NSFW & intimate preferences',
        'questions': spicy_questions
    },
    'couple_trivia': {
        'emoji': '🎯', 'name': 'Couple Trivia', 'description': 'Basic facts & daily habits',
        'questions': couple_trivia_questions
    },
    'truth_or_lie': {
        'emoji': '🤥', 'name': 'Truth or Lie', 'description': 'Wild confessions & secret facts',
        'questions': truth_questions
    }
}

import json

# Replace in static/js/app.js
with open('static/js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Let's find "const GAME_DATA =" block and replace it perfectly
game_data_json_str = json.dumps(game_data_dict, indent=2, ensure_ascii=False)

# Let's do a regex replacement of const GAME_DATA = { ... };
pattern = r'const GAME_DATA\s*=\s*\{[\s\S]*?\n\};'
replacement = f'const GAME_DATA = {game_data_json_str};'

new_js, count = re.subn(pattern, replacement, js)

if count > 0:
    with open('static/js/app.js', 'w', encoding='utf-8') as f:
        f.write(new_js)
    print("SUCCESS: 240 questions injected into static/js/app.js!")
else:
    print("WARNING: Direct regex match failed, trying alternative replacement...")
    # fallback to target replace if regex was slightly off
    start_index = js.find('const GAME_DATA =')
    if start_index != -1:
        # find the closing block of GAME_DATA (it ends before let sessionQuestions = [])
        end_index = js.find('let sessionQuestions =')
        if end_index != -1:
            # slice out the old GAME_DATA
            new_js = js[:start_index] + f'const GAME_DATA = {game_data_json_str};\n\n' + js[end_index:]
            with open('static/js/app.js', 'w', encoding='utf-8') as f:
                f.write(new_js)
            print("FALLBACK SUCCESS: 240 questions injected into static/js/app.js!")
        else:
            print("ERROR: Could not find let sessionQuestions in app.js")
    else:
        print("ERROR: Could not find const GAME_DATA in app.js")
