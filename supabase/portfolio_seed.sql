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
  ('/blog', 'Blog', 5),
  ('/resume', 'Resume', 6),
  ('/contact', 'Contact', 7),
  ('/terminal', 'My Terminal', 8);

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

insert into public.blog_posts (slug, title, excerpt, read_time, category, image, content, sort_order) values
  (
    'ai-in-development',
    'Leveraging AI in Modern Software Development',
    'A practical view of how AI-assisted workflows improve code generation, review, testing, and documentation without replacing engineering judgment.',
    '8 min read',
    'Development',
    '/blog/ai-development.jpg',
    '<h2>Introduction</h2><p>AI has become a practical layer in modern software delivery. It helps developers move faster on research, scaffolding, debugging, and documentation, while still requiring strong product and engineering judgment.</p><h2>Where AI Helps Most</h2><ul><li>Generating boilerplate and accelerating repetitive implementation work</li><li>Supporting code review and surfacing potential issues earlier</li><li>Improving test drafting, debugging, and release confidence</li><li>Making documentation and handoff notes easier to maintain</li></ul><h2>Why Judgment Still Matters</h2><p>The strongest teams use AI as a collaborator, not an autopilot. Architecture, security, product tradeoffs, and maintainability still depend on experienced human decisions.</p><h2>How I Use It</h2><p>I use AI support for planning, code acceleration, and communication, especially when exploring implementation options for React products, APIs, and product workflows. Claude-assisted discovery is particularly useful early in product thinking and iteration.</p><h2>Closing Thought</h2><p>Good AI usage is not about replacing craft. It is about creating more space for better design, clearer decisions, and higher-quality execution.</p>',
    1
  ),
  (
    'create-react-app-deprecated',
    'Why Create React App Is Being Deprecated',
    'Why the React ecosystem moved on from CRA and what modern teams gain from frameworks like Next.js and newer tooling.',
    '6 min read',
    'React',
    '/blog/cra-deprecated.png',
    '<h2>Introduction</h2><p>Create React App helped standardize React project setup for years, but the ecosystem has shifted toward faster tooling and more capable frameworks.</p><h2>What Changed</h2><ul><li>Developers expect faster local feedback loops and better bundlers</li><li>TypeScript and ESM-based workflows are now mainstream</li><li>Frameworks increasingly provide routing, data fetching, and optimization out of the box</li></ul><h2>Why Teams Move On</h2><p>Newer stacks reduce setup friction, improve performance, and give teams stronger defaults for production-grade applications.</p><h2>Where Next.js Fits</h2><p>For teams building modern React products, Next.js offers a stronger foundation for routing, multi-page architecture, server rendering, and performance-focused delivery.</p><h2>Conclusion</h2><p>The deprecation of CRA reflects ecosystem maturity. Today, teams benefit from tools that align more closely with current product needs and deployment expectations.</p>',
    2
  );

insert into public.terminal_commands (label, sort_order) values
  ('about', 1),
  ('skills', 2),
  ('experience', 3),
  ('projects', 4),
  ('contact', 5),
  ('react-collab', 6),
  ('supabase-api', 7),
  ('claude-workflow', 8);
