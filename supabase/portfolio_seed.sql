delete from public.contact_submissions;
delete from public.terminal_commands;
delete from public.blog_posts;
delete from public.project_stacks;
delete from public.projects;
delete from public.experience_highlights;
delete from public.experiences;
delete from public.featured_skills;
delete from public.skill_items;
delete from public.skill_groups;
delete from public.collaboration_pillars;
delete from public.home_stats;
delete from public.site_navigation;
delete from public.site_profile;

insert into public.site_profile (
  id, name, role, location, email, phone, github, linkedin, avatar, tagline, intro
) values (
  1,
  'Sandeep Gowda',
  'Software Developer',
  'Bengaluru, India',
  'sandeepgowda2314@gmail.com',
  '+91 8105486993',
  'https://github.com/Sandeep2325',
  'https://www.linkedin.com/in/sandeep-gowda-cc-54a117223/',
  '/profile.jpeg',
  'Building product-focused web experiences, real-time platforms, and AI-assisted engineering workflows.',
  'I design and ship modern full-stack products with React, Next.js, TypeScript, Django, FastAPI, and cloud infrastructure. My work spans product UI, backend APIs, automation, and immersive experiences.'
);

insert into public.site_navigation (href, label, sort_order) values
  ('/', 'Home', 1),
  ('/skills', 'Skills', 2),
  ('/experience', 'Experience', 3),
  ('/projects', 'Projects', 4),
  ('/contact', 'Contact', 5);

insert into public.home_stats (label, value, sort_order) values
  ('Years Building', '4+', 1),
  ('Core Stack', 'React + Next.js', 2),
  ('Backend Focus', 'Django / FastAPI', 3),
  ('Collaboration', 'React + Supabase', 4);

insert into public.collaboration_pillars (title, description, sort_order) values
  ('React Product Builds', 'Component systems, dashboards, multi-page apps, design implementation, and frontends that feel fast and intentional.', 1),
  ('Supabase API Integrations', 'Schema-aware app development, auth flows, realtime features, storage, and backend-backed product experiences.', 2),
  ('Claude-Assisted Workflows', 'Prompt-guided product discovery, implementation planning, and AI-supported development pipelines that still keep engineering judgment in the loop.', 3);

insert into public.skill_groups (id, title, sort_order)
overriding system value
values
  (1, 'Frontend Engineering', 1),
  (2, 'Backend and APIs', 2),
  (3, 'Data and Cloud', 3),
  (4, 'AI and Emerging Tech', 4);

insert into public.skill_items (group_id, label, sort_order) values
  (1, 'React.js', 1),
  (1, 'Next.js', 2),
  (1, 'TypeScript', 3),
  (1, 'JavaScript', 4),
  (1, 'Redux', 5),
  (1, 'HTML5', 6),
  (1, 'CSS3', 7),
  (1, 'Bootstrap', 8),
  (2, 'Django', 1),
  (2, 'FastAPI', 2),
  (2, 'Python', 3),
  (2, 'REST APIs', 4),
  (2, 'Authentication', 5),
  (2, 'Automation', 6),
  (2, 'Node.js', 7),
  (3, 'PostgreSQL', 1),
  (3, 'MySQL', 2),
  (3, 'MongoDB', 3),
  (3, 'AWS EC2', 4),
  (3, 'Deployment', 5),
  (3, 'Supabase API', 6),
  (4, 'Claude Workflow Support', 1),
  (4, 'AI-Assisted Development', 2),
  (4, 'Unity', 3),
  (4, 'Godot', 4),
  (4, 'VR Experiences', 5);

insert into public.featured_skills (label, sort_order) values
  ('React.js', 1),
  ('Next.js', 2),
  ('TypeScript', 3),
  ('Django', 4),
  ('FastAPI', 5),
  ('Supabase API', 6),
  ('Claude Workflow Support', 7),
  ('AWS EC2', 8);

insert into public.experiences (id, company, role, dates, summary, sort_order)
overriding system value
values
  (1, 'QuickAds', 'Software Developer', 'June 2025 - Present', 'Shipped and maintained a video ad platform across frontend, backend, cloud deployment, and API automation.', 1),
  (2, 'Getafix Technologies', 'Software Developer', 'Apr 2024 - July 2025', 'Delivered full-stack features for an ad platform while balancing infrastructure, performance, and product needs.', 2),
  (3, 'Innovya Technologies', 'Software Developer', 'Apr 2023 - Apr 2024', 'Worked on immersive products, game mechanics, and deployment across VR and interactive environments.', 3),
  (4, 'Nexevo Technologies Pvt Ltd', 'Python Developer', 'Jan 2022 - Feb 2023', 'Built full-stack business applications and API-backed workflows with a Django-centered stack.', 4);

insert into public.experience_highlights (experience_id, text, sort_order) values
  (1, 'Built product features using React, TypeScript, Next.js, and FastAPI.', 1),
  (1, 'Managed AWS EC2 deployment flow for stable releases.', 2),
  (1, 'Integrated third-party APIs to support automation and ad operations.', 3),
  (1, 'Worked across PostgreSQL-backed backend services and frontend delivery.', 4),
  (2, 'Developed frontend experiences in React and TypeScript.', 1),
  (2, 'Contributed to FastAPI services and PostgreSQL-backed data workflows.', 2),
  (2, 'Improved deployment and operational reliability on AWS EC2.', 3),
  (2, 'Supported integrations, automation, and product optimization work.', 4),
  (3, 'Built VR applications for Pico and Oculus using Unity and C#.', 1),
  (3, 'Created gameplay systems and mechanics using Godot.', 2),
  (3, 'Led delivery across web, game, and VR project scopes.', 3),
  (4, 'Developed Django applications with JavaScript, jQuery, and Bootstrap.', 1),
  (4, 'Implemented authentication and CRUD APIs for product teams.', 2),
  (4, 'Supported staging and production deployments.', 3);

insert into public.projects (id, name, description, impact, sort_order)
overriding system value
values
  (1, 'QuickAds Video Ad Platform', 'An end-to-end video ad creation and management platform with automation, deployment, and product-facing workflows.', 'Full-stack ownership across UI, backend services, cloud delivery, and integrations.', 1),
  (2, 'VR Video Player for Oculus and PICO', 'A 360-degree VR video playback experience built for immersive streaming and headset-first interaction.', 'Expanded product work beyond web into spatial computing and real-time 3D UX.', 2),
  (3, 'Medical E-commerce Platform', 'A commerce experience for medical products with catalog flows, operational logic, and secure transactions.', 'Delivered business-facing e-commerce functionality on a stable full-stack foundation.', 3),
  (4, 'Insurance Brokerage Application', 'A web application for brokerage workflows, client data management, and internal process support.', 'Strengthened experience building internal tools for operational efficiency.', 4),
  (5, 'B2B E-commerce Website', 'A B2B commerce solution with API-driven product flows, state management, and business-focused interactions.', 'Combined backend APIs with modern React frontend architecture.', 5);

insert into public.project_stacks (project_id, label, sort_order) values
  (1, 'React', 1),
  (1, 'TypeScript', 2),
  (1, 'Next.js', 3),
  (1, 'FastAPI', 4),
  (1, 'AWS EC2', 5),
  (2, 'Unity', 1),
  (2, 'C#', 2),
  (2, 'PICO SDK', 3),
  (2, 'Oculus OVR', 4),
  (3, 'Django', 1),
  (3, 'MySQL', 2),
  (3, 'JavaScript', 3),
  (3, 'AJAX', 4),
  (3, 'HTML/CSS', 5),
  (4, 'Django', 1),
  (4, 'MySQL', 2),
  (4, 'JavaScript', 3),
  (4, 'jQuery', 4),
  (5, 'Django REST Framework', 1),
  (5, 'React.js', 2),
  (5, 'Redux', 3),
  (5, 'Axios', 4);

