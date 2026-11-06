# v104: English Language & Literature, three original questions for each of the 21 existing skills (63).
# Literature facts are limited to well-known points of the NCERT First Flight / Footprints Without Feet texts. A teacher must still review (needs_review).
import os
from v104_lib import mcq, write
SEED = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'seed')
Q = []; A = Q.append
C, G, V, F = 'COMPREHENSION_GAP', 'GRAMMAR_RULE', 'VOCABULARY_GAP', 'STRUCTURE_FORMAT'

s='explain-lencho-faith-irony'
A(mcq(s,1,'In "A Letter to God", what destroyed Lencho\'s ripe crop?','A hailstorm',['A flood','A fire','A swarm of locusts'],'After a short shower, hail beat down on the fields and ruined the crop.',C))
A(mcq(s,2,'Why did the postmaster decide to reply to Lencho\'s letter?','He was moved by Lencho\'s faith and did not want to shake it',['He wanted to catch Lencho for cheating','He was ordered to by the government','He wanted to become friends with Lencho'],'The postmaster admired Lencho\'s complete faith in God and tried to help by collecting money.',C))
A(mcq(s,3,'What is the irony at the end of the story?','The man who trusts God completely accuses the kind postal staff of being thieves',['God sends the money himself','Lencho becomes rich','The postmaster refuses to help'],'Lencho\'s faith is real, but he blames the very people who helped him, so his praise of God and his anger at humans clash.',C))

s='explain-mandela-courage'
A(mcq(s,1,'In "Long Walk to Freedom", where was Mandela\'s inauguration held?','At the Union Buildings in Pretoria',['In Cape Town Castle','On Robben Island','In a stadium in London'],'The ceremony took place in the amphitheatre formed by the Union Buildings in Pretoria.',C))
A(mcq(s,2,'Mandela says a brave man is one who:','Conquers his fear',['Never feels fear','Fights without thinking','Avoids danger'],'Mandela says courage is not the absence of fear but the triumph over it.',C))
A(mcq(s,3,'According to Mandela, why must the oppressor also be freed?','Because a man who takes away another\'s freedom is himself a prisoner of hatred and narrow-mindedness',['Because oppressors are always weaker','Because freedom is only for the powerful','Because laws forbid punishment'],'Mandela says both the oppressed and the oppressor must be liberated.',C))

s='identify-apartheid-context'
A(mcq(s,1,'What name is given to the system of racial discrimination that South Africa ended in 1994?','Apartheid',['Colonialism','Feudalism','Federalism'],'Apartheid was the policy of racial separation and white-minority rule.',V))
A(mcq(s,2,'What did Mandela promise about the new South Africa in his speech?','The land would never again experience the oppression of one by another',['Only one race would hold power','Foreign countries would rule it','Elections would be stopped'],'He declared that the oppression of one by another must never happen again.',C))
A(mcq(s,3,'Why was Mandela\'s inauguration a historic moment?','He became the first democratically elected, non-racial leader of the country',['He was crowned a king','South Africa joined a new empire','It was the end of all elections'],'The 1994 elections were the first in which all South Africans could vote.',C))

s='identify-anne-frank-diary-address'
A(mcq(s,1,'Whom does Anne Frank address in her diary?','Kitty',['Margot','Peter','Miep'],'Anne names her diary "Kitty" and writes to it as to a friend.',C))
A(mcq(s,2,'Why does Anne say she began keeping a diary?','She felt she had no true friend to confide in',['Her teacher ordered her to','She wanted to become famous','She wanted to sell it'],'Anne says she hopes to confide everything to the diary, as she had never been able to confide in anyone.',C))
A(mcq(s,3,'What does Anne mean when she says "paper has more patience than people"?','A diary listens without interrupting or judging',['Paper is cheaper than friends','People write more than paper holds','Paper never gets old'],'She values the diary because it receives her thoughts without argument.',C))

s='explain-valli-bus-journey'
A(mcq(s,1,'What does Valli, the girl in "Madam Rides the Bus", most want to do?','Ride a bus to the town',['Go to school','Buy a gift','Meet a film star'],'Her dream of riding the bus is the story\'s main thread.',C))
A(mcq(s,2,'What did Valli see on the road that made her feel sad and think about life?','A dead cow',['A burning house','A lost child','A broken bus'],'The sight of the dead cow showed her the sadder side of life.',C))
A(mcq(s,3,'How is Valli different at the end of the journey compared with the start?','She is more aware of suffering and more thoughtful',['She is angrier with her family','She is afraid of travelling','She wants to stay in the town'],'The trip gives her new experience and a growing understanding of the world.',C))

s='interpret-dust-of-snow'
A(mcq(s,1,'In "Dust of Snow", which bird shakes snow on the poet?','A crow',['A sparrow','An eagle','A parrot'],'A crow shakes down dust of snow from a hemlock tree.',C))
A(mcq(s,2,'What change comes over the poet after the snow falls on him?','His sad mood lifts',['He becomes angry','He falls asleep','He loses his way'],'The small event changes his mood and saves part of a day he had begun to regret.',C))
A(mcq(s,3,'Which tree does the dust of snow fall from?','A hemlock tree',['A pine tree','A mango tree','A palm tree'],'The poem says the crow shook it down from a hemlock tree.',C))

s='interpret-fire-and-ice'
A(mcq(s,1,'In "Fire and Ice", what does the poet say about how the world will end?','Some people say fire, some say ice',['Everyone agrees it will end in water','It will end in darkness','It will never end'],'The poem opens with these two opinions.',C))
A(mcq(s,2,'In the poem, fire stands for:','Desire',['Love of nature','Anger at winter','Hope'],'Fire symbolises desire; the poet has "tasted of desire".',C))
A(mcq(s,3,'In the poem, ice stands for:','Hatred',['Peace','Patience','Poverty'],'Ice is a symbol of cold hatred, which the poet says is equally capable of destruction.',C))

s='identify-poetic-devices'
A(mcq(s,1,'"The wind whispered through the trees." Which device is this?','Personification',['Simile','Alliteration','Onomatopoeia'],'The wind is given the human action of whispering.',G))
A(mcq(s,2,'"Her smile was as bright as the sun." Which device is this?','Simile',['Metaphor','Personification','Hyperbole'],'A simile compares two things using "as" or "like".',G))
A(mcq(s,2,'"Silent sailors sailed slowly." Which device is shown by the repeated s sound?','Alliteration',['Metaphor','Irony','Simile'],'Alliteration repeats the same starting consonant sound.',G))

s='explain-tricki-overfeeding'
A(mcq(s,1,'What kind of dog is Tricki in "A Triumph of Surgery"?','A Pekingese',['An Alsatian','A bulldog','A poodle'],'Tricki is Mrs Pumphrey\'s pampered Pekingese.',C))
A(mcq(s,2,'What made Tricki ill?','Too much rich food and too little exercise',['A snake bite','A broken leg','A cold bath'],'Mrs Pumphrey overfed him with cream and sweets and gave little exercise.',C))
A(mcq(s,3,'How did Herriot cure Tricki?','By keeping him at the surgery and putting him on a strict diet with exercise',['By a long operation','By giving strong medicine only','By taking him to a specialist abroad'],'Herriot kept him away from the overfeeding and made him run and play with other dogs.',C))

s='identify-thief-story-characters'
A(mcq(s,1,'Who is the thief in "The Thief\'s Story"?','Hari Singh',['Anil','Ramu','Ustad'],'Hari Singh is the young thief; Anil is the writer he plans to rob.',C))
A(mcq(s,2,'What does Anil offer to teach Hari Singh?','Reading and writing',['Cooking','Wrestling','Driving'],'Anil agrees to teach him to read and write.',C))
A(mcq(s,3,'Why does Hari Singh stay close to Anil at first?','He plans to rob him once he gains his trust',['He wants to become a writer','He is afraid of the police','He is Anil\'s cousin'],'Hari befriends Anil as part of his plan to steal.',C))

s='identify-midnight-visitor-characters'
A(mcq(s,1,'Who is Ausable in "The Midnight Visitor"?','A secret agent',['A famous writer','A hotel owner','A policeman'],'Ausable is a secret agent who does not look like one.',C))
A(mcq(s,2,'Who is Fowler in "The Midnight Visitor"?','A young man who wants to be a writer of mystery stories',['A rival agent','A hotel clerk','A taxi driver'],'Fowler hopes to write stories and admires adventurous people.',C))
A(mcq(s,3,'Which quality of Ausable does the story highlight?','Quick thinking and presence of mind',['Laziness','Fear','Greed'],'He outwits the intruder with a clever trick.',C))

s='explain-ebright-curiosity'
A(mcq(s,1,'What hobby did young Richard Ebright start that led him toward science?','Collecting butterflies',['Collecting stamps','Playing cricket','Painting'],'His butterfly collecting began his interest in scientific observation.',C))
A(mcq(s,2,'In "The Making of a Scientist", what did Ebright\'s mother do to help his curiosity?','She encouraged him and gave him support and materials',['She forbade experiments','She sent him away to school','She asked him to stop collecting'],'His parents encouraged his interest and supplied what he needed.',C))
A(mcq(s,3,'What does the lesson tell us about becoming a scientist?','Curiosity, support and hands-on work matter',['Only expensive labs matter','Luck matters more than effort','Scientists are born, not made'],'Ebright\'s path shows how curiosity and encouragement grow into a career.',C))

s='apply-past-perfect-tense'
A(mcq(s,1,'Choose the correct sentence: "By the time we reached the station, the train ___."','had left',['has left','leaves','was leave'],'The earlier of two past actions takes the past perfect (had + past participle).',G))
A(mcq(s,2,'Fill in: "She ___ finished her homework before her friends arrived."','had',['has','have','was'],'"Had finished" shows an action completed before another past action.',G))
A(mcq(s,3,'Which sentence uses the past perfect correctly?','He had never seen snow before he visited Manali.',['He has never seen snow before he visited Manali.','He never had saw snow before.','He had never see snow before.'],'Had + past participle (seen).',G))

s='apply-modals-prohibition'
A(mcq(s,1,'Choose the modal that shows a rule or strong obligation: "Passengers ___ wear seat belts."','must',['might','could','may'],'Must shows obligation.',G))
A(mcq(s,2,'Which sentence shows prohibition?','You must not park here.',['You may park here.','You need not park here.','You can park here.'],'Must not forbids an action; need not only says it is unnecessary.',G))
A(mcq(s,3,'"You ___ come to school tomorrow; it is a holiday." Fill with the modal meaning "it is not necessary".','need not',['must not','ought to','should'],'Need not means it is unnecessary; must not means it is forbidden.',G))

s='convert-active-passive'
A(mcq(s,1,'Change to passive: "The teacher praised the students."','The students were praised by the teacher.',['The students praised the teacher.','The students are praised by the teacher.','The teacher was praised by the students.'],'The object becomes the subject and the verb takes the form was/were + past participle.',G))
A(mcq(s,2,'Change to passive: "They are building a new bridge."','A new bridge is being built by them.',['A new bridge was built by them.','A new bridge is built by them.','A new bridge has been built.'],'The present continuous becomes is/are being + past participle.',G))
A(mcq(s,3,'Which is the active form of "The letter was written by Rohan."?','Rohan wrote the letter.',['Rohan writes the letter.','Rohan has written the letter.','The letter wrote Rohan.'],'The agent becomes the subject; the tense stays the simple past.',G))

s='convert-direct-reported-speech'
A(mcq(s,1,'Report: He said, "I am tired."','He said that he was tired.',['He said that I am tired.','He said that he is tired.','He said that I was tired.'],'In reported speech the pronoun changes and the present tense moves back to the past.',G))
A(mcq(s,2,'Report: She said to me, "I will help you."','She told me that she would help me.',['She told me that I would help her.','She said me that she will help me.','She told me that she will help you.'],'will changes to would and the pronouns change.',G))
A(mcq(s,3,'Report: The teacher said, "Honesty is the best policy."','The teacher said that honesty is the best policy.',['The teacher said that honesty was the best policy only.','The teacher said honesty is a best policy.','The teacher said that honesty had been the best policy.'],'A universal truth keeps the present tense in reported speech.',G))

s='apply-subject-verb-agreement'
A(mcq(s,1,'Choose the correct sentence.','The list of items is on the table.',['The list of items are on the table.','The list of items were on the table.','The lists of items is on the table.'],'The subject is "list" (singular), not "items".',G))
A(mcq(s,2,'Choose the correct verb: "Neither of the boys ___ present."','was',['were','are','have been'],'"Neither" takes a singular verb.',G))
A(mcq(s,3,'Choose the correct verb: "Each of the students ___ a book."','has',['have','are having','were'],'"Each" is singular, so it takes a singular verb: has.',G))

s='identify-clause-types'
A(mcq(s,1,'In "I know that he is honest", the clause "that he is honest" is a:','Noun clause',['Adjective clause','Adverb clause','Main clause'],'It acts as the object of "know", the job of a noun.',G))
A(mcq(s,2,'In "The book that I bought is useful", "that I bought" is a:','Adjective clause',['Noun clause','Adverb clause','Phrase'],'It describes the noun "book".',G))
A(mcq(s,3,'In "We stayed home because it rained", "because it rained" is an:','Adverb clause',['Noun clause','Adjective clause','Independent clause'],'It tells why, so it modifies the verb.',G))

s='compose-formal-letter'
A(mcq(s,1,'Which closing is correct for a formal letter beginning "Dear Sir"?','Yours faithfully,',['Your loving friend,','Bye for now,','With hugs,'],'Dear Sir/Madam pairs with Yours faithfully; a named person pairs with Yours sincerely.',F))
A(mcq(s,2,'Where does the subject line of a formal letter come?','After the salutation and before the body',['At the very end','Before the sender\'s address','After the signature'],'The subject line follows "Dear Sir/Madam" and states the matter briefly.',F))
A(mcq(s,3,'Which is the correct opening of the body of a complaint letter?','I am writing to bring to your notice the problem of irregular water supply in our colony.',['Hi, hope you are fine lol!','Listen, you must fix this now.','Sir, water water water.'],'A formal letter states its purpose politely and clearly.',F))

s='compose-analytical-paragraph'
A(mcq(s,1,'What is the first thing to do when writing an analytical paragraph on a bar graph?','State what the graph shows and the main trend',['Write your own story','Copy the numbers one by one','Give your opinion on the government'],'Start with the topic and the overall pattern, then support with data.',F))
A(mcq(s,2,'Which sentence best compares data?','Sales rose sharply from 20 in 2022 to 60 in 2024.',['Sales are good.','I like the colour of the bars.','The chart is big.'],'A good analysis uses specific values and shows change.',F))
A(mcq(s,3,'What should the last line of an analytical paragraph do?','Give a brief conclusion based on the data',['Introduce a new unrelated topic','Ask a question to the examiner','Repeat the first line word for word'],'End by summing up what the data suggest.',F))

s='infer-from-passage'
A(mcq(s,1,'Read: "Mira packed her umbrella although the sky was clear, because the radio had warned of rain." What can you infer?','The weather forecast made her cautious',['She forgot her umbrella','She hates rain','The radio was broken'],'She acted on the forecast, not the clear sky.',C))
A(mcq(s,2,'Read: "Arjun looked at the empty bowl, then at his mother, and quietly began to wash the plates." What can you infer about Arjun?','He is helpful and considerate',['He is angry with his mother','He is sleepy','He dislikes food'],'His quiet action suggests thoughtfulness.',C))
A(mcq(s,3,'Read: "The village well, once full, now showed a cracked bed of mud. The farmers watched the sky each evening." What is the most likely situation?','A drought',['A flood','A festival','A new school'],'The dry well and the watching of the sky point to lack of rain.',C))

write(os.path.join(SEED, 'cbse-class10-english-v104-diagnostic.json'), 'english', Q)
