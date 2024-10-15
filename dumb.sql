INSERT INTO image_storage (name, image_name, location, category) VALUES
('day1image', 'day1.png', 'images/points/DailyLogins/day1.png', 'daily login'),
('day2image', 'day2.png', 'images/points/DailyLogins/day2.png', 'daily login'),
('day3image', 'day3.png', 'images/points/DailyLogins/day3.png', 'daily login'),
('day4image', 'day4.png', 'images/points/DailyLogins/day4.png', 'daily login'),
('day5image', 'day5.png', 'images/points/DailyLogins/day5.png', 'daily login'),
('day6image', 'day6.png', 'images/points/DailyLogins/day6.png', 'daily login');

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE image_storage TO mashlabm_yahia;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_music_id_seq TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE token_rewards TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE streak_rewards TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE export_rewards TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE image_rewards TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE used_ai_rewards TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ai_parents TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ai_models TO mashlabm_yahia;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE rewards TO mashlabm_yahia;

INSERT INTO modelTokens (model, tokens) VALUES
('flux-realism', 73500),
('stable-diffusion-v3-medium', 73500),
('flux-pro', 105000),
('flux/schnell', 6300),
('flux/dev', 105000);

INSERT INTO modelTokens (model, tokens) VALUES
('prompthero/openjourney', 50000),
('runwayml/stable-diffusion-v1-5', 50000),
('SG161222/Realistic_Vision_V3.0_VAE', 50000),
('stabilityai/stable-diffusion-2-1', 50000),
('stabilityai/stable-diffusion-xl-base-1.0', 50000),
('wavymulder/Analog-Diffusion', 50000);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE modeltokens TO mashlabm_yahia;

-- INSERT INTO ai_parents (id, parent_name, logo_url, category_id, created_at, background_color, text_color) VALUES
-- (1, 'Prompt Hero', 'link_to_logo', 1, '2024-09-05 13:57:03.458997', '0', '0'),
-- (2, 'Runway ML', 'images/logos/aiLogos/RunwayML.png', 1, '2024-09-05 13:57:03.458997', '#FFFFFF', '#000000'),
-- (3, 'SG161222', 'link_to_logo', 1, '2024-09-05 13:57:03.458997', '0', '0'),
-- (4, 'Stability AI', 'images/logos/aiLogos/StabilityAI.png', 1, '2024-09-05 13:57:03.458997', '#E1E1FF', '#2D2D2D'),
-- (5, 'Wavymulder', 'link_to_logo', 1, '2024-09-05 13:57:03.458997', '0', '0'),
-- (6, 'BFL', 'link_to_logo', 2, '2024-09-05 13:57:03.458997', '0', '0'),
-- (7, '01.AI', 'images/logos/aiLogos/01ai.png', 3, '2024-09-05 13:57:03.458997', '#FFFFFF', '#15594A'),
-- (8, 'Allen AI', 'images/logos/aiLogos/AllenAi.png', 3, '2024-09-05 13:57:03.458997', '#0A3235', '#FFFFFF'),
-- (9, 'Autism', 'link_to_logo', 3, '2024-09-05 13:57:03.458997', '0', '0'),
-- (10, 'Cognitive Computations', 'link_to_logo', 3, '2024-09-05 13:57:03.458997', '0', '0'),
-- (11, 'DeepSeek', 'link_to_logo', 3, '2024-09-05 13:57:03.458997', '0', '0'),
-- (12, 'Gemini', 'images/logos/aiLogos/gemini.png', 3, '2024-09-05 13:57:03.458997', '0', '0'),
-- (13, 'Gryphe', 'link_to_logo', 3, '2024-09-05 13:57:03.458997', '#FFFFFF', '#000000'),
-- (14, 'LM Sys', 'images/logos/aiLogos/LMSys.png', 3, '2024-09-05 13:57:03.458997', '#A07C5A', '#FFFFFF'),
-- (15, 'Meta', 'images/logos/aiLogos/Meta.png', 4, '2024-09-05 13:57:03.458997', '#0164E0', '#FFFFFF'),
-- (16, 'Mistralai', 'images/logos/aiLogos/MistralAI.png', 3, '2024-09-05 13:57:03.458997', '#F4EED7', '#000000'),
-- (17, 'NousResearch', 'images/logos/aiLogos/NousResearch.png', 3, '2024-09-05 13:57:03.458997', '#FFFFFF', '#000000'),
-- (18, 'OpenChat', 'link_to_logo', 3, '2024-09-05 13:57:03.458997', '0', '0'),
-- (19, 'OpenOrca', 'images/logos/aiLogos/OpenOrca.png', 3, '2024-09-05 13:57:03.458997', '#F7F6F1', '#000000'),
-- (20, 'Qwen', 'images/logos/aiLogos/Qwen.png', 3, '2024-09-05 13:57:03.458997', '#FFFFFF', '#3C329E'),
-- (21, 'Snorkel AI', 'images/logos/aiLogos/SnorkelAI.png', 3, '2024-09-05 13:57:03.458997', '#3A1BC3', '#FFFFFF'),
-- (22, 'Stanford', 'link_to_logo', 3, '2024-09-05 13:57:03.458997', '0', '0'),
-- (23, 'Teknium', 'link_to_logo', 3, '2024-09-05 13:57:03.458997', '0', '0'),
-- (24, 'TII UAE', 'images/logos/aiLogos/TIIUAE.png', 3, '2024-09-05 13:57:03.458997', '#233746', '#FFFFFF'),
-- (25, 'Together', 'link_to_logo', 3, '2024-09-05 13:57:03.458997', '0', '0'),
-- (26, 'Undi95', 'link_to_logo', 3, '2024-09-05 13:57:03.458997', '0', '0'),
-- (27, 'WizardLM', 'link_to_logo', 4, '2024-09-05 13:57:03.458997', '0', '0'),
-- (28, 'OpenAI', 'images/logos/aiLogos/ChatGPT.png', 4, '2024-09-05 17:52:59.375056', '#74AA9C', '#FFFFFF'),
-- (29, 'Anthropic', 'images/logos/aiLogos/Claude.png', 3, '2024-09-05 13:57:03.458997', '#F0EEE5', '#2D2D2D'),
-- (30, 'Deepgram', 'images/logos/aiLogos/DeepGram.png', 6, '2024-09-05 13:57:03.458997', '#FFFFFF', '#000000'),
-- (31, 'Phind', 'images/logos/aiLogos/Phind.png', 4, '2024-09-05 13:57:03.458997', '#000000', '#FFFFFF'),
-- (32, 'suno', 'images/logos/aiLogos/suno.png', 5, '2024-09-05 16:43:10.812635', '#000000', '#FFFFFF'),
-- (33, 'Stability AI', 'images/logos/aiLogos/StabilityAI.png', 2, '2024-09-05 17:46:05.812593', '#E1E1FF', '#2D2D2D'),
-- (34, 'Meta', 'images/logos/aiLogos/Meta.png', 3, '2024-09-05 13:57:03.458997', '#0164E0', '#FFFFFF'),
-- (35, 'OpenAI', 'images/logos/aiLogos/ChatGPT.png', 3, '2024-09-05 13:57:03.458997', '#74AA9C', '#FFFFFF');

INSERT INTO public.rewards (id, category, numbers, points, badge_name, code_name) VALUES
(1, 'token', 2000, 100, 'Tokens Rookie', 'tokens_rookie'),
(2, 'token', 4500, 300, 'Tokens Novice', 'tokens_novice'),
(3, 'token', 7000, 700, 'Tokens Specialist', 'tokens_specialist'),
(4, 'token', 15000, 1500, 'Tokens Master', 'tokens_master'),
(5, 'token', 25000, 5000, 'Tokens Pioneer', 'tokens_pioneer'),
(6, 'streak', 3, 10, 'First Step Login', 'first_step_login'),
(7, 'streak', 5, 25, 'Getting Warmed Up', 'getting_warmed_up'),
(8, 'streak', 9, 70, 'Daily Devotee', 'daily_devotee'),
(9, 'streak', 14, 150, 'Routine Regular', 'routine_regular'),
(10, 'streak', 30, 500, 'Steady Supporter', 'steady_supporter'),
(11, 'streak', 45, 1000, 'Reliable Regular', 'reliable_regular'),
(12, 'streak', 60, 2000, 'Streak Specialist', 'streak_specialist'),
(13, 'daily_login', 1, 2, 'Day 1', 'na'),
(14, 'daily_login', 2, 4, 'Day 2', 'na'),
(15, 'daily_login', 3, 8, 'Day 3', 'na'),
(16, 'daily_login', 4, 15, 'Day 4', 'na'),
(17, 'daily_login', 5, 25, 'Day 5', 'na'),
(18, 'daily_login', 6, 40, 'Day 6', 'na'),
(19, 'tool', 10, 30, 'Asteroid Explorer', 'asteroid_explorer'),
(20, 'tool', 25, 100, 'Planetary Explorer', 'planetary_explorer'),
(21, 'tool', 40, 220, 'Galactic Explorer', 'galactic_explorer'),
(22, 'tool', 90, 400, 'Quasar Explorer', 'quasar_explorer'),
(23, 'tool', 170, 600, 'Cosmic Explorer', 'cosmic_explorer'),
(24, 'image', 40, 50, 'Light Seizer', 'light_seizer'),
(25, 'image', 100, 120, 'Starry Novice', 'starry_novice'),
(26, 'image', 250, 300, 'Stellar Artist', 'stellar_artist'),
(27, 'image', 600, 1000, 'Universe Virtuoso', 'universe_virtuoso'),
(28, 'document', 20, 30, 'File Rookie', 'file_rookie'),
(29, 'document', 45, 80, 'Content Custodian', 'content_custodian'),
(30, 'document', 100, 150, 'Stellar Organizer', 'stellar_organizer'),
(31, 'document', 250, 350, 'Cosmic Archiect', 'cosmic_architect');



INSERT INTO public.image_storage (name, code_name, location, category) VALUES
('day1image', 'day1.png', 'images/points/DailyLogins/day1.png', 'daily login'),
('day2image', 'day2.png', 'images/points/DailyLogins/day2.png', 'daily login'),
('day3image', 'day3.png', 'images/points/DailyLogins/day3.png', 'daily login'),
('day4image', 'day4.png', 'images/points/DailyLogins/day4.png', 'daily login'),
('day5image', 'day5.png', 'images/points/DailyLogins/day5.png', 'daily login'),
('day6image', 'day6.png', 'images/points/DailyLogins/day6.png', 'daily login'),
('Asteroid Explorer', 'asteroid_explorer', 'images/points/UsageBadges/asteroid_explorer.png', 'Usage Badges'),
('Content Custodian', 'content_custodian', 'images/points/Exporting/content_custodian.png', 'Exporting'),
('Cosmic Archiect', 'cosmic_archiect', 'images/points/Exporting/cosmic_archiect.png', 'Exporting'),
('Cosmic Explorer', 'cosmic_explorer', 'images/points/UsageBadges/cosmic_explorer.png', 'Usage Badges'),
('File Rookie', 'file_rookie', 'images/points/Exporting/file_rookie.png', 'Exporting'),
('Galactic Explorer', 'galactic_explorer', 'images/points/UsageBadges/galactic_explorer.png', 'Usage Badges'),
('Planetary Explorer', 'planetary_explorer', 'images/points/UsageBadges/planetary_explorer.png', 'Usage Badges'),
('Quasar Explorer', 'quasar_explorer', 'images/points/UsageBadges/quasar_explorer.png', 'Usage Badges'),
('Stellar Artist', 'stellar_artist', 'images/points/ImageGeneration/stellar_artist.png', 'Image Generation'),
('Stellar Organizer', 'stellar_organizer', 'images/points/Exporting/stellar_organizer.png', 'Exporting'),
('Tokens Master', 'tokens_master', 'images/points/TokenConsumption/tokens_master.png', 'Token Consumption'),
('Tokens Novice', 'tokens_novice', 'images/points/TokenConsumption/tokens_novice.png', 'Token Consumption'),
('Tokens Pioneer', 'tokens_pioneer', 'images/points/TokenConsumption/tokens_pioneer.png', 'Token Consumption'),
('Tokens Rookie', 'tokens_rookie', 'images/points/TokenConsumption/tokens_rookie.png', 'Token Consumption'),
('Tokens Specialist', 'tokens_specialist', 'images/points/TokenConsumption/tokens_specialist.png', 'Token Consumption'),
('Universe Virtuoso', 'universe_virtuoso', 'images/points/ImageGeneration/universe_virtuoso.png', 'Image Generation'),
('Light Seizer', 'light_seizer', 'images/points/ImageGeneration/light_seizer.png', 'Image Generation'),
('Starry Novice', 'starry_novice', 'images/points/ImageGeneration/starry_novice.png', 'Image Generation');
