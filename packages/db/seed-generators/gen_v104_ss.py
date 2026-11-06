# v104: Social Science, two original questions for each skill whose chapter is on the 2026-27 list (about 76).
# Skipped on purpose (deleted from the board syllabus or project-work only): explain-social-difference-politics (Democracy and Diversity),
# identify-democracy-challenges (Challenges to Democracy), explain-consumer-rights-protection (Consumer Rights).
# Facts are standard NCERT points; no numbers that change from year to year. A teacher must review (needs_review).
import os
from v104_lib import mcq, write
SEED = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'seed')
Q = []; A = Q.append
C, P, T, I = 'CONCEPT_CONFUSION', 'PREREQUISITE_GAP', 'TERMINOLOGY_CONFUSION', 'INCOMPLETE_REASONING'

# ---------- History ----------
s='explain-nationalism-spread-europe'
A(mcq(s,1,'Which meeting of 1815 tried to restore the monarchies that Napoleon had removed in Europe?','The Congress of Vienna',['The Treaty of Versailles','The Berlin Conference','The Bretton Woods Conference'],'European powers met at Vienna in 1815 under Metternich to restore the old order.',C))
A(mcq(s,2,'Giuseppe Mazzini is remembered for founding which secret society?','Young Italy',['Red Shirts','Zollverein','The Frankfurt Parliament'],'Mazzini founded Young Italy in Marseilles, and later Young Europe.',P))
s='compare-germany-italy-unification'
A(mcq(s,2,'Who was the chief minister of Prussia who led the unification of Germany?','Otto von Bismarck',['Count Cavour','Garibaldi','Metternich'],'Bismarck used wars with Denmark, Austria and France to unify Germany under Prussia.',P))
A(mcq(s,2,'Which Italian chief minister led the movement for unification under the king of Sardinia-Piedmont?','Count Cavour',['Bismarck','Mazzini','Napoleon'],'Cavour, helped by Garibaldi\'s forces, brought most of Italy together under Victor Emmanuel II.',P))
s='explain-non-cooperation-movement'
A(mcq(s,1,'Which event of 1919, in which a crowd was fired upon in Amritsar, deeply angered Indians?','Jallianwala Bagh massacre',['Dandi March','Quit India Movement','Simon Commission'],'General Dyer ordered troops to fire on a peaceful gathering on 13 April 1919.',P))
A(mcq(s,2,'Why did Gandhi withdraw the Non-Cooperation Movement in 1922?','Violence at Chauri Chaura',['The British agreed to all demands','Congress was banned','Exams were due'],'After a mob burnt a police station at Chauri Chaura, Gandhi stopped the movement as he believed in non-violence.',I))
s='identify-symbols-collective-belonging'
A(mcq(s,1,'The Swadeshi movement began in Bengal in protest against which British decision?','The partition of Bengal',['The Rowlatt Act','The Salt Tax','The Simon Commission'],'The 1905 partition of Bengal led people to boycott British goods and use Indian-made ones.',P))
A(mcq(s,2,'Which artist painted the well-known image of Bharat Mata as a calm, divine woman?','Abanindranath Tagore',['Raja Ravi Varma','Amrita Sher-Gil','Nandalal Bose'],'Abanindranath Tagore painted Bharat Mata, shaping the idea of the nation as a mother figure.',P))
s='describe-pre-modern-global-links'
A(mcq(s,1,'The ancient trade routes that linked Asia with Europe and North Africa were known as the:','Silk Routes',['Spice Highways','Cotton Roads','Gold Lines'],'Silk, textiles, spices and ideas travelled along these routes.',T))
A(mcq(s,2,'What did the Spanish and Portuguese conquest of America bring that harmed local people the most?','Diseases such as smallpox',['New crops only','Railways','The telegraph'],'Diseases to which the local people had no immunity killed very large numbers.',C))
s='explain-great-depression'
A(mcq(s,1,'In which year did the Great Depression begin with a stock market crash in the USA?','1929',['1914','1945','1991'],'The Wall Street crash of 1929 started the worldwide slump.',P))
A(mcq(s,2,'Which was a major effect of the Great Depression on India?','Prices and exports of farm goods fell sharply',['Exports increased','Peasants became richer','Foreign loans rose'],'Falling prices hurt peasants who had debts to repay.',C))
s='explain-proto-industrialisation'
A(mcq(s,1,'Proto-industrialisation refers to:','Production for an international market before the coming of factories',['Production only inside factories','Production by machines run on electricity','Production for home use only'],'Merchants gave raw material to rural families who worked at home.',T))
A(mcq(s,2,'In proto-industrial production, who usually supplied the raw material to peasants and artisans?','Merchants',['Factory owners','The government','Foreign soldiers'],'Merchants moved work into the countryside where labour was cheaper.',C))
s='explain-colonial-impact-indian-industries'
A(mcq(s,1,'Which British city\'s machine-made cotton goods competed strongly against Indian handloom cloth?','Manchester',['Delhi','Lisbon','Paris'],'Cheap Manchester imports hit Indian weavers in the 19th century.',P))
A(mcq(s,2,'Who set up the first iron and steel works in India, at Jamshedpur?','J. N. Tata',['G. D. Birla','Dwarkanath Tagore','Cowasjee Davar'],'Jamsetji Tata\'s plans led to the first steel plant (TISCO) in the early 20th century.',P))
s='explain-print-revolution-impact'
A(mcq(s,1,'Who developed the modern printing press with movable metal type in Europe around the 1440s?','Johann Gutenberg',['Martin Luther','Marco Polo','Voltaire'],'Gutenberg\'s press at Strasbourg made books cheaper and more widely available.',P))
A(mcq(s,2,'What effect did cheaper printed books have on ordinary people?','More people could read and share ideas',['Fewer people learned to read','Only monks could use books','Ideas spread more slowly'],'Print made reading material available beyond the rich and the church.',C))
s='explain-print-nationalism-link'
A(mcq(s,1,'Which law of 1878 restricted the Indian-language press in British India?','The Vernacular Press Act',['The Rowlatt Act','The Indian Councils Act','The Pitt\'s India Act'],'It allowed the government to censor reports it found disloyal.',P))
A(mcq(s,2,'How did newspapers help the Indian national movement?','They spread ideas of freedom and criticised colonial rule',['They stopped the movement','They only printed advertisements','They were written in English only'],'Newspapers carried news and ideas that built a sense of unity.',C))

# ---------- Geography ----------
s='classify-resources'
A(mcq(s,1,'Which of these is a renewable resource?','Solar energy',['Coal','Petroleum','Iron ore'],'Renewable resources can be replaced naturally or are not used up.',C))
A(mcq(s,2,'Resources classified as biotic come from:','Living things',['Rocks and metals only','The Moon','Artificial sources'],'Biotic resources include forests, animals and fish; coal is also biotic in origin because it formed from plants.',T))
s='identify-indian-soil-types'
A(mcq(s,1,'Which soil is the most widespread in the northern plains of India?','Alluvial soil',['Laterite soil','Black soil','Arid soil'],'Rivers have deposited alluvial soil across the Indo-Gangetic plain.',P))
A(mcq(s,2,'Black soil is especially suitable for growing:','Cotton',['Tea','Coconut only','Apples'],'Black (regur) soil holds moisture and suits cotton.',C))
s='explain-forest-wildlife-conservation'
A(mcq(s,1,'In which year was the Wildlife (Protection) Act passed in India?','1972',['1947','1991','2005'],'The Act protects habitats and bans hunting of listed species.',P))
A(mcq(s,2,'The Chipko movement was a campaign to:','Save trees from being cut',['Plant crops in winter','Build dams','Open mines'],'Villagers hugged trees to stop felling in the Himalayan region.',C))
s='explain-water-scarcity-conservation'
A(mcq(s,1,'Which is a main cause of water scarcity in India?','Growing population and over-use of water',['Too few rivers in the entire world','Plenty of rain in every area','Lack of sunlight'],'Rising demand and unequal access reduce water available per person.',C))
A(mcq(s,2,'Which of these is a traditional method of rainwater harvesting in Rajasthan?','Tankas',['Johads in Kerala only','Dams on the Narmada','Bamboo drip irrigation in Meghalaya'],'Tankas are covered underground tanks that store rain from roofs.',P))
s='evaluate-river-valley-projects'
A(mcq(s,1,'Which river is the Bhakra-Nangal project built on?','Sutlej',['Mahanadi','Krishna','Kaveri'],'Bhakra Nangal is on the Sutlej; Hirakud is on the Mahanadi.',P))
A(mcq(s,2,'Which is a common criticism of large multipurpose dams?','They displace people and affect the environment',['They never produce electricity','They cause droughts everywhere','They reduce farming'],'Dams provide irrigation and power but flood land and move communities.',C))
s='classify-major-crops-india'
A(mcq(s,1,'Which of these is a Rabi crop?','Wheat',['Rice','Jute','Cotton'],'Rabi crops are sown in winter and harvested in spring; wheat is the main one.',P))
A(mcq(s,2,'Which of these is a Kharif crop?','Rice',['Wheat','Mustard','Barley'],'Kharif crops are sown with the monsoon in June–July.',P))
s='explain-agricultural-reforms'
A(mcq(s,1,'The White Revolution in India refers to a big increase in:','Milk production',['Cotton production','Wheat production','Fish catch'],'Operation Flood grew milk output and dairy cooperatives.',T))
A(mcq(s,2,'Which was a land reform introduced to help small farmers?','Abolition of zamindari',['Closing all banks','Banning farming','Importing all grain'],'Removing zamindari gave tenants more rights over land.',C))
s='classify-minerals-india'
A(mcq(s,1,'Which of these is a non-metallic mineral?','Mica',['Iron ore','Copper','Bauxite'],'Mica is non-metallic; iron, copper and bauxite are metallic.',C))
A(mcq(s,2,'Which mineral is the main ore of aluminium?','Bauxite',['Haematite','Limestone','Manganese'],'Bauxite is refined into alumina and then aluminium.',P))
s='compare-energy-sources'
A(mcq(s,1,'Which of these is a conventional source of energy?','Coal',['Solar power','Wind power','Tidal power'],'Coal, petroleum, natural gas and hydel power are conventional sources.',C))
A(mcq(s,2,'Which is a non-conventional source of energy?','Wind',['Natural gas','Coal','Firewood'],'Wind, solar, tidal and geothermal energy are non-conventional.',C))
s='classify-industries'
A(mcq(s,1,'Cotton textile and sugar industries are examples of:','Agro-based industries',['Mineral-based industries','Public sector only','Cottage industries only'],'They use farm products as raw material.',C))
A(mcq(s,2,'Industries that are owned and run by the government are called:','Public sector industries',['Private sector industries','Cooperative industries','Joint sector only'],'Examples include SAIL and BHEL.',P))
s='explain-industrial-pollution-control'
A(mcq(s,1,'Which pollution results from untreated factory waste being released into rivers?','Water pollution',['Noise pollution','Light pollution','Soil sealing'],'Industrial effluents poison water and harm life in it.',C))
A(mcq(s,2,'Which step helps control industrial water pollution?','Treating waste water before releasing it',['Releasing hot water directly','Burning more coal','Dumping waste in rivers'],'Treatment removes harmful materials before discharge.',C))
s='compare-transport-modes'
A(mcq(s,1,'Which mode of transport is the fastest?','Air transport',['Roadways','Railways','Waterways'],'Airways reach distant and remote places quickly but cost more.',C))
A(mcq(s,2,'Which mode is cheapest for carrying heavy, bulky goods over long distances?','Waterways',['Airways','Roadways','Pipelines for people'],'Water transport has low cost per tonne.',C))
s='explain-trade-tourism-role'
A(mcq(s,1,'The exchange of goods and services between countries is called:','International trade',['Local trade only','Barter only','Tourism'],'Exports and imports make up international trade.',T))
A(mcq(s,2,'How does tourism help a region?','It creates jobs and brings income',['It closes local markets','It stops all travel','It reduces employment'],'Tourism supports hotels, guides, transport and crafts.',C))

# ---------- Political Science ----------
s='distinguish-power-sharing-forms'
A(mcq(s,1,'Sharing of power among the legislature, executive and judiciary is called:','Horizontal power sharing',['Vertical power sharing','Community government','Coalition'],'These organs are at the same level; each checks the others.',T))
A(mcq(s,2,'Sharing of power between the central, state and local governments is called:','Vertical power sharing',['Horizontal power sharing','Majoritarianism','Separation of powers'],'Power is shared among governments at different levels.',T))
s='compare-belgium-srilanka-power-sharing'
A(mcq(s,1,'Which step did Belgium take to accommodate its different language groups?','Gave a fair share of power to all groups, including community governments',['Gave all power to the Dutch speakers','Banned one language','Removed regional governments'],'Belgium shared power by equal ministers and community governments.',C))
A(mcq(s,2,'What did the 1956 Act in Sri Lanka do?','Made Sinhala the only official language',['Made Tamil official alone','Created two equal languages','Abolished all languages'],'It ignored Tamil and led to alienation of the Tamil community.',C))
s='list-federalism-features'
A(mcq(s,1,'In a federal system, power is divided between:','The central government and state governments',['The people and the army','Kings and priests','Courts and newspapers'],'Federalism has two or more levels of government with their own powers.',T))
A(mcq(s,2,'In India, which subjects are listed in the Concurrent List?','Subjects on which both the Union and states can make laws',['Subjects only for states','Subjects only for the Union','Subjects only for panchayats'],'Education and marriage are examples; the Union law prevails in a conflict.',C))
s='explain-decentralisation-india'
A(mcq(s,1,'Which constitutional amendment of 1992 gave constitutional status to local government?','The 73rd and 74th Amendments',['The 42nd Amendment','The 91st Amendment','The 1st Amendment'],'They created the panchayati raj and municipal systems with regular elections.',P))
A(mcq(s,2,'What fraction of seats in local bodies is reserved for women?','One-third',['One-tenth','Three-fourths','One-half only for cities'],'At least one-third of the seats are reserved for women.',P))
s='explain-gender-political-participation'
A(mcq(s,1,'The unequal division of work between men and women in many homes is called:','Sexual division of labour',['Women\'s empowerment','Political equality','Majoritarianism'],'Household work is often seen as women\'s task, even when they also work outside.',T))
A(mcq(s,2,'Why is women\'s representation in legislatures important?','It brings women\'s concerns into law-making',['It makes laws longer','It removes elections','It reduces voting'],'Without enough women, issues affecting them may be ignored.',C))
s='explain-caste-politics-link'
A(mcq(s,1,'Which Article of the Constitution prohibits discrimination on grounds of caste?','Article 15',['Article 1','Article 370','Article 356'],'Article 15 prohibits discrimination on grounds including caste, religion and gender.',P))
A(mcq(s,2,'Is it correct to say that elections in India are won only on caste lines?','No, voters also consider performance, policies and other factors',['Yes, always','Yes, in every constituency','Yes, since parties are banned from other issues'],'Caste matters but no party wins from one community alone.',I))
s='explain-political-party-functions'
A(mcq(s,1,'Which is a main function of a political party?','Contest elections and put forward policies and candidates',['Run schools only','Collect taxes','Appoint judges'],'Parties contest elections, form governments and act as opposition.',C))
A(mcq(s,2,'In a democracy, what role does the party that does not form the government play?','The opposition, criticising the government and voicing alternatives',['It stops all debate','It rules together with the government','It becomes the judiciary'],'A strong opposition keeps the government accountable.',C))
s='distinguish-party-systems'
A(mcq(s,1,'In which party system does only one party hold power legally?','One-party system',['Two-party system','Multi-party system','Alliance only'],'China is an example of a one-party system.',T))
A(mcq(s,2,'Which party system does India follow?','Multi-party system',['One-party system','Two-party system','No-party system'],'Several parties compete, and coalitions are common.',T))
s='evaluate-democracy-outcomes'
A(mcq(s,1,'Which is a reason democracy is considered better than other forms?','It allows mistakes to be corrected and citizens to be heard',['It guarantees fast growth always','It removes all problems','It needs no elections'],'Democracy offers accountability and room for correction.',C))
A(mcq(s,2,'What does it mean that a democratic government is accountable?','It must answer to the people and follow rules',['It can act without rules','It is never criticised','It is formed by the army'],'Accountability means the government can be questioned and removed at elections.',T))

# ---------- Economics ----------
s='compare-development-indicators'
A(mcq(s,1,'Per capita income means:','Total income of a country divided by its population',['Income of the richest person','Total exports of the country','Average age of people'],'It is a simple average and hides differences between people.',T))
A(mcq(s,2,'The Human Development Index (HDI) combines which three areas?','Health, education and income',['Roads, ports and airports','Army, navy and air force','Crops, minerals and forests'],'The UNDP publishes HDI using life expectancy, schooling and per capita income.',P))
s='explain-sustainable-development'
A(mcq(s,1,'Development that meets present needs without harming the needs of future generations is called:','Sustainable development',['Rapid growth','Free trade','Planned recession'],'It takes care of resources like water and soil so they last.',T))
A(mcq(s,2,'Why is over-use of groundwater a problem for development?','It can run out and hurt future farming',['It improves rainfall','It makes soil richer','It has no effect'],'Falling water tables make wells dry and raise costs.',C))
s='classify-economic-sectors'
A(mcq(s,1,'Agriculture, fishing and mining belong to which sector?','Primary sector',['Secondary sector','Tertiary sector','Public sector'],'The primary sector uses natural resources directly.',T))
A(mcq(s,2,'Banking, teaching and transport are examples of the:','Tertiary sector',['Primary sector','Secondary sector','Informal sector only'],'The tertiary or service sector produces services, not goods.',T))
s='distinguish-organised-unorganised-sector'
A(mcq(s,1,'Which feature is typical of the organised sector?','Fixed working hours and job security',['No rules','No records','Irregular pay always'],'Organised sector jobs are registered and follow government rules.',C))
A(mcq(s,2,'Which of these describes the unorganised sector?','Small scattered units with irregular, low pay and little job security',['Large government offices only','Jobs with pensions for all','Factories with strong unions only'],'Most Indian workers are in the unorganised sector.',C))
s='explain-money-barter-solution'
A(mcq(s,1,'What is the main problem of the barter system?','Both parties must want exactly what the other has',['Too much money circulates','Goods cannot be traded','Banks refuse loans'],'This is called the double coincidence of wants.',C))
A(mcq(s,2,'Who issues currency notes in India?','The Reserve Bank of India',['State Bank of India','The Ministry of Education','Local banks'],'The RBI issues notes, except the one-rupee note issued by the Government of India.',P))
s='identify-terms-of-credit'
A(mcq(s,1,'An asset that a borrower pledges as security against a loan is called:','Collateral',['Interest','Deposit','Receipt'],'If the loan is not repaid, the lender can sell the collateral.',T))
A(mcq(s,2,'The extra amount a borrower pays to the lender over the loan is called:','Interest',['Collateral','Principal only','Dividend'],'Interest is the cost of borrowing.',T))
s='explain-globalisation-factors'
A(mcq(s,1,'A company that owns or controls production in more than one country is called a:','Multinational company (MNC)',['Cooperative society','Self-help group','Panchayat'],'MNCs set up offices and factories in different countries.',T))
A(mcq(s,2,'Which organisation sets rules for international trade and was set up in 1995?','The World Trade Organization (WTO)',['The United Nations Children\'s Fund','The Reserve Bank of India','The Election Commission'],'WTO members agree rules to reduce trade barriers.',P))
s='evaluate-globalisation-impact-india'
A(mcq(s,1,'Which is a benefit of globalisation for consumers in India?','More choice of goods at better quality and prices',['Fewer products to buy','Higher taxes on every item','Fewer jobs everywhere'],'Competition from imports and MNCs widens choice.',C))
A(mcq(s,2,'Which group may be harmed by globalisation?','Small producers who cannot compete with cheap imports',['All large companies','All consumers','Banks only'],'Small units may close if they cannot match costs and quality.',I))

write(os.path.join(SEED, 'cbse-class10-social-science-v104-diagnostic.json'), 'social-science', Q)
