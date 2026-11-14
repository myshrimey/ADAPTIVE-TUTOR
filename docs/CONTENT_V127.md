# Social Science: 521 more questions (v127, 2026-11-13)

Founder request: "Add 500+ questions in social science". 521 new multiple-choice questions, all `needs_review`, original wording, 13 or more for each of the 40 on-syllabus skills (the three skills skipped earlier because they are not on the syllabus still have only their one old question). Social Science now holds about 783 questions in the seed files.

Files: `packages/db/seed/cbse-class10-social-science-v127a..d-diagnostic.json` (a history, b geography, c geography/politics, d politics/economics). Helper: `seed-generators/v126_finalize.py`. Test: t127.

How they were made: four parallel helper agents (three were interrupted by usage limits and re-run), checked by the finalize script (real skill, four different options, no repeated prompts) and t127. No facts were independently verified.

Teacher: please check these first (flagged by the writers):
- History: Italy taking Rome in 1870 after French troops left; the 1905 Swadeshi flag with eight lotuses and a crescent; the Potosi silver and noodles-to-pasta stories; Gutenberg Bible "about 180 copies in about three years"; Diamond Sutra dated 868 (called the oldest Japanese printed book, which follows the textbook although it is of Chinese origin); first Tamil book printed at Cochin in 1579; Petit and Tata capital attributed to the opium trade (textbook says "China trade"); Dwarkanath Tagore ventures collapsing in the 1840s; first jute mill 1855; Indian Press Act 1910 security deposit; Young India as an English-language journal; a loose 1897 plague editorial scenario question.
- Geography: largest sugarcane producer (Uttar Pradesh; editions vary); Arabica coffee brought from Yemen; tidal energy (Gulf of Khambhat; Gulf of Kachchh is also a tidal site); the black-soil description (alluvial soil is also fairly potash-rich); Gobar gas, Sringaverapura and Gendathur figures; two questions on Verghese Kurien and M.S. Swaminathan that go a little beyond the textbook; Kandla as a tidal port; National Waterway No. 1 (Prayagraj to Haldia).
- Politics: first panchayati raj (Nagaur, 1959); Eleventh Schedule has 29 subjects; Women's Reservation Act 2023 (one-third; not yet in force); Belgium Dutch-speakers about 59%; Sri Lanka independence 1948 and Buddhism's foremost place; Dowry Prohibition Act 1961; Domestic Violence Act 2005; Mandal 27% (central jobs); Satyashodhak Samaj 1873; Kanshi Ram and the BSP 1984; wording of the questions on candidates' disclosure of property and criminal cases; an odd-one-out in the caste skill (Sati abolition is a social reform, not anti-caste, movement).
- Economics: Net Attendance Ratio definition (ages 14 to 15); Payment of Gratuity Act; MoSPI as the GDP estimate publisher; the NCERT claim that dictatorships had slightly higher growth on average; Kerala vs Haryana comparison.
- Weak options: a few wrong options are plain ("Tax laws", "Too many free elections", "None of these").

Founder step after deploying: `node packages/db/seed-diagnostic.js` (safe to re-run).
