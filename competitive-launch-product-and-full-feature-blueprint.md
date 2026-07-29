# Universal parenting companion: competitive launch product and full feature blueprint

**Prepared for two full-stack founders | 17 July 2026**

## Executive decision

Do not launch a bare MVP containing only feeding, sleep and diaper buttons. That product would enter a market where free trackers already have millions of downloads.

Build a **Competitive Launch Product (CLP)**: substantially more capable than a traditional MVP, but narrower than the complete vision. The launch product should cover children aged 0–24 months and make three promises immediately:

1. **Remember what happened:** fast care tracking and caregiver sync.
2. **Know what comes next:** personalized sleep/routine prediction.
3. **Know what matters today:** age-based development activity and milestone guidance.

It should also begin the family memory archive, because that increases long-term retention. These four systems—tracking, prediction, development and memories—are enough to position the app as a genuine parent companion rather than another tracker.

Recommended launch timeframe for two capable developers working full-time with AI assistance: **12–16 weeks**, including closed beta and launch hardening. Ten weeks may produce a demo, but content review, data safety, family synchronization, subscription testing and real-parent QA are not safely compressed in the same way as code generation.

Recommended complete-product timeframe: **9–15 months after the launch product**, driven more by expert content, user learning, localization and compliance than raw implementation.

## Product definition

### Category

Stage-adaptive parenting companion for pregnancy through age six, initially optimized for newborn through 24 months.

### Primary promise

> **Know what happened, what comes next, and what matters today.**

### Primary initial customer

- First-time parent.
- Child aged 0–12 months, expandable to 24 months at launch.
- Shares care with a partner, grandparent, nanny or daycare.
- Currently uses memory, notes, WhatsApp or separate tracking apps.
- Will pay to reduce mental load, improve sleep/routines and feel confident about development.

### Secondary customers

- Co-parent who needs coordination rather than educational content.
- Caregiver who needs a simple handoff workflow.
- Parent of a premature baby, after expert review of adjusted-age behavior.
- Parent with multiple children.
- Expecting parent in the later complete application.

## Product principles

1. **Universal underneath, simple on the surface.** The system may contain many modules, but the parent sees only what is relevant today.
2. **The home screen is a plan, not a menu.** It answers what happened, what is next and what to do.
3. **Common actions take one or two taps.** A tired parent should not search through categories at 3 a.m.
4. **Free tools create the habit; premium intelligence creates the purchase.**
5. **The product changes as the child changes.** Sleep and feeding gradually give way to solids, activities, routines, milestones and memories.
6. **Recommendations are supportive, not diagnostic.** The app organizes and educates; it does not replace clinicians.
7. **Every logged event should eventually create value.** A feed updates a pattern, sleep improves prediction, a milestone becomes a memory, and a week of activity becomes a recap.
8. **Co-parent collaboration is a growth loop.** Do not hide basic family sync behind an immediate paywall.
9. **No guilt mechanics.** Missing a day should not make the parent feel they failed the child.
10. **Trust is visible.** Explain why information is requested and how it is used.

## Information architecture

Use five primary destinations. Avoid a separate tab for every module.

### 1. Today

The adaptive daily home screen.

Contains:

- current child and age/stage;
- active timers;
- last feed, sleep and diaper;
- predicted next nap/bedtime;
- today's development activity;
- one milestone or memory prompt;
- alerts and caregiver handoff;
- quick-add button;
- short daily summary.

### 2. Track

All care logging and the chronological timeline.

Categories:

- sleep;
- feeding;
- pumping;
- diaper/potty;
- medicine/temperature;
- growth;
- activity/custom event;
- notes.

The parent selects which categories are visible. Do not activate all categories by default.

### 3. Plan

The premium intelligence destination.

Contains:

- sleep forecast and schedule;
- wake-window guidance;
- personalized development plan;
- activity library;
- routines;
- age/stage guidance;
- later: feeding/solids plan.

### 4. Journey

The child's long-term record.

Contains:

- milestones;
- growth;
- health records;
- photos, memories and voice;
- weekly/monthly recaps;
- annual story;
- later: printed books.

### 5. Family

Contains:

- family members and caregivers;
- roles and permissions;
- handoff summaries;
- multiple children;
- notification preferences;
- subscription/account;
- privacy/export/delete;
- support.

## The Competitive Launch Product (CLP)

This is the recommended first public release. It is intentionally larger than a traditional MVP.

## CLP module 1: onboarding and personalization

### Required features

1. Parent account creation.
2. Parent role: mother, father, guardian or caregiver, using inclusive language.
3. Child name or nickname.
4. Date of birth and due date.
5. Premature-birth/adjusted-age setting, hidden unless relevant.
6. Child sex optional and requested only when necessary for growth references.
7. Time zone and measurement units.
8. Main current goal:
   - sleep;
   - feeding/tracking;
   - development;
   - routines/organization;
   - family coordination;
   - memories.
9. Current care categories to show.
10. Typical sleep information, if the parent chooses sleep.
11. Feeding method selection.
12. Invite co-parent/caregiver.
13. Notification preference.
14. Plain-language privacy summary.
15. Premium trial explanation.

### Onboarding rules

- Maximum eight required screens; optional questions can be completed later.
- Parent should reach the first useful Today screen within two minutes.
- Do not require a long developmental questionnaire before delivering value.
- Ask for notification permission only after demonstrating why a reminder is useful.
- The first selected goal determines the initial Today layout.

### First-session success moment

The parent should complete at least one of these before leaving:

- start the first feed/sleep timer;
- see the first predicted schedule;
- receive the first personalized activity;
- invite the co-parent.

## CLP module 2: Today plan

The Today screen is the major product differentiator.

### Core cards

#### Right now

- active timer;
- last feed/sleep/diaper;
- elapsed time since last event;
- one-tap start/stop/edit;
- caregiver responsible for the most recent event.

#### What comes next

- predicted next nap and bedtime;
- expected wake window;
- feeding reminder when enabled;
- confidence/learning state such as “starting estimate” versus “personalized from recent patterns”;
- ability to adjust for a car nap, missed nap or unusual day.

#### What matters today

- one development activity selected by age, stage, parent goal and recent completed activities;
- approximate duration;
- materials needed;
- developmental areas supported;
- skip, save, replace or complete.

#### Capture this moment

- one milestone observation or memory prompt;
- quick photo, text or voice response;
- optional conversion of a completed milestone into a memory.

### Daily summary

At an appropriate time, show:

- total sleep;
- number of feeds and diapers;
- completed activity;
- one trend or observation;
- a private memory highlight;
- tomorrow's broad plan.

Avoid alarming language. “Today differed from the recent average” is safer than “abnormal.”

## CLP module 3: fast tracking

### Sleep

- start/stop sleep timer;
- nap versus night sleep;
- edit start/end time;
- manual past entry;
- location optional;
- sleep notes optional;
- night waking;
- settle method optional;
- timeline and daily total.

### Feeding

- breast timer by left/right side;
- pause and switch side;
- bottle amount and contents;
- formula/breast milk distinction optional;
- feeding notes;
- manual past entry;
- last-side indicator;
- daily total.

### Pumping

- start/stop session;
- left/right/both;
- amount;
- storage note optional;
- daily total.

### Diaper

- wet, dirty, mixed or dry;
- color/consistency optional and collapsed;
- notes;
- daily count.

### Medicine and temperature

- medicine name;
- amount/unit as entered by parent;
- time;
- reminders;
- temperature and measurement method;
- clear statement that the app records parent-entered information and does not calculate treatment or dosage.

### Growth

- weight;
- height/length;
- head circumference;
- measurement date;
- chart with clearly attributed reference source;
- no diagnostic conclusion.

### Custom event

- parent-defined label;
- timer or one-time entry;
- icon/color;
- examples: tummy time, bath, walk, screen time or physiotherapy exercise.

### Tracking convenience

- customizable quick-action order;
- active timer accessible from every primary screen;
- undo recent action;
- copy/repeat recent entry;
- edit history;
- daily timeline;
- caregiver attribution;
- voice/natural-language logging such as “120 ml formula at 2:10”; parent confirms before save;
- widgets/lock-screen shortcuts where available;
- basic use during poor connectivity;
- user-visible sync status when another caregiver is active.

## CLP module 4: family collaboration

### Roles

#### Parent/guardian

- full child access;
- invite/remove caregivers;
- edit profile and records;
- manage subscription;
- export/delete.

#### Caregiver

- track care events;
- view today's schedule and recent history;
- add notes;
- no account deletion or ownership changes.

#### Viewer

- view selected memories and recaps;
- cannot see private health/care records unless explicitly allowed.

### Features

- invite by secure link/email;
- real-time shared timeline;
- clear name on each entry;
- “since you were away” handoff summary;
- caregiver availability/status optional;
- notes for the next caregiver;
- notification when an important medicine entry is logged, if enabled;
- ability to hide selected memories or health records from viewers;
- removal and permission-change history.

### Free/premium boundary

- Free: two parent/caregiver accounts and basic sync.
- Premium: larger family group, granular permissions, viewer roles and automated handoff reports.

## CLP module 5: sleep intelligence

This is the first major paid hook.

### Launch features

1. Age-based baseline sleep schedule.
2. Next-nap prediction after a minimum amount of information.
3. Bedtime prediction.
4. Wake-window view.
5. Parent-adjustable schedule.
6. Notifications before predicted sleep time.
7. Schedule regeneration after an unusual nap.
8. Daily and seven-day sleep totals.
9. Nap-length and bedtime trends.
10. Suggested wind-down routine.
11. Explanation of why a time is suggested.
12. Manual mode for parents who prefer fixed wake windows.
13. “Ignore today” or vacation/sick-day setting.
14. Feedback: too early, accurate, too late.
15. Safety note that predictions are guidance and should be combined with the child's cues.

### Launch sleep content

- 15 age/stage routine templates;
- 30 short sleep guides;
- guidance on naps, wake windows, bedtime, night waking and regressions;
- reviewed by a qualified sleep/child-development professional;
- sources and review dates stored for every guide.

### Free/premium boundary

- Free: log sleep, basic totals and one trial prediction.
- Premium: ongoing predictions, schedule, trends, routines and insights.

## CLP module 6: development and milestones

This is the second major paid hook and the main lifecycle extension.

### Milestone domains

- gross motor;
- fine motor;
- cognitive/problem solving;
- receptive language;
- expressive language;
- social-emotional;
- self-help/adaptive skills where appropriate.

### Milestone behavior

- parent can mark: not observed, emerging, observed or skip;
- no public score or “behind” badge;
- display a broad observation window rather than a single deadline where supported;
- related activities suggested after marking emerging;
- optional note/photo/memory;
- milestone history;
- adjusted-age handling after expert review;
- professional-contact suggestion only when reviewed content identifies an appropriate concern, using careful wording.

### Activity system

Each activity includes:

- title;
- target age/stage;
- duration;
- required materials;
- setup steps;
- what the parent does;
- what to observe;
- safety note;
- developmental domains;
- easier and harder variations;
- save/skip/complete;
- parent rating and feedback;
- alternative activity button.

### Launch content quantity

- **200+ reviewed activities** covering 0–24 months;
- **250+ milestone observations** across domains and stages;
- 40 short development guides;
- 24 monthly stage summaries;
- 50 rainy-day/no-equipment/short-time activity filters;
- plan to add at least 20 activities per month after launch.

Quality matters more than claiming 1,000 shallow activities. Every launch activity should be usable, safe, illustrated and reviewed.

### Personalized plan

- one primary activity per day;
- two alternatives;
- weekly balance across domains;
- avoids recently skipped/completed activities;
- incorporates the parent's available time and materials;
- recap of activities completed this week;
- optional reminder.

### Free/premium boundary

- Free: milestone overview, limited activity samples and one activity several times per week.
- Premium: full daily plan, complete library, adaptive recommendations and progress summaries.

## CLP module 7: insights and reports

### Free insights

- today and seven-day totals;
- recent timeline;
- simple averages;
- basic growth chart;
- basic weekly recap.

### Premium insights

- 30- and 90-day trends;
- sleep prediction accuracy;
- wake-window distribution;
- feeding and pumping summaries;
- caregiver contribution/handoff report;
- development activity balance;
- milestone history;
- custom date range;
- PDF/printable report;
- plain-language summaries;
- comparison only with the child's own recent patterns unless professionally validated reference ranges are appropriate.

### Insight language rules

- “Your baby's daytime sleep was 25 minutes longer than their recent average.”
- Not: “Your baby is oversleeping.”
- “You recorded fewer feeds than usual.”
- Not: “Your baby is not eating enough.”

## CLP module 8: memories and recaps

### Entry types

- text note;
- photo;
- voice recording;
- funny quote;
- first/milestone;
- gratitude or parent reflection;
- letter to child.

### Features

- create from milestone or activity completion;
- automatically suggest relevant care data without exposing private details by default;
- weekly memory recap;
- monthly highlight selection;
- chronological story view;
- edit date;
- contributors;
- privacy per entry;
- export selected memories;
- original voice retained when transcription is used;
- AI can lightly clean wording only with explicit parent approval.

### Launch scope

- digital timeline;
- weekly recap;
- simple annual-story preview;
- no physical book ordering yet.

### Free/premium boundary

- Free: limited storage/entries and basic export.
- Premium: higher storage, voice, advanced recap, story layouts and complete annual export.

## CLP module 9: restricted parenting assistant

Include an assistant at launch only if it is deliberately bounded. It gives the product a modern paid differentiator without pretending to be a doctor.

### Allowed launch capabilities

- explain how to use an app feature;
- summarize the parent's recorded week;
- suggest a development activity from the reviewed library;
- suggest a routine from reviewed content;
- explain general sleep concepts;
- answer general development questions using reviewed material;
- find a relevant guide;
- convert natural language into a proposed log entry;
- help create a caregiver handoff summary.

### Disallowed launch capabilities

- diagnosis;
- medicine dosage;
- treatment recommendation;
- interpreting symptoms as safe or dangerous without escalation;
- predicting developmental disorders;
- saying the baby is healthy, normal or delayed;
- emergency advice beyond directing the parent to appropriate professional/emergency help.

### Safety features

- visible “educational, not medical” boundary;
- source links/review date;
- emergency and high-risk keyword handling;
- report answer;
- do not save sensitive assistant chats as memories automatically;
- parent chooses whether child context is included.

### Free/premium boundary

- Free: a small number of questions or feature-help only.
- Premium: broader reviewed-content guidance and personalized summaries.

## CLP module 10: notifications and reminders

### Types

- active timer reminder;
- expected nap preparation;
- feeding/medicine reminder set by parent;
- daily activity;
- caregiver handoff;
- weekly recap;
- milestone prompt;
- trial/subscription notice;
- privacy/security notice.

### Rules

- parent controls each category;
- quiet hours;
- no shame language;
- no excessive “your baby needs…” claims;
- group related notifications;
- learn preferred reminder time only with consent;
- reminders remain useful without becoming the product's primary engagement trick.

## CLP module 11: subscription and conversion

### Plans at launch

#### Free

- core tracking;
- two caregivers;
- basic timeline and summaries;
- limited development activities;
- milestone overview;
- limited memories;
- basic export.

#### Premium

- sleep predictions and personalized schedule;
- full activity and development plan;
- advanced insights and reports;
- expanded family roles;
- assistant guidance;
- full recaps and memory/story features;
- premium export.

### Pricing test

- Global founding annual: US$59.
- Global standard annual: US$79.
- Global monthly: US$9.99.
- India founding annual: ₹1,999.
- India standard annual: ₹2,999.
- India monthly: ₹299.

### Trial

- seven days of complete premium;
- reminder before charge;
- clear annual total, not only monthly equivalent;
- after cancellation/decline, preserve the free tracker and user data;
- no artificial countdown that implies data will disappear.

### Contextual paywall moments

- first reliable sleep prediction;
- personalized weekly development plan;
- opening a 30-day trend;
- adding the third caregiver;
- opening the annual story preview;
- after the parent has completed several valuable actions, not before they see the product.

## CLP module 12: trust, safety and account control

Launch blockers, not optional polish:

- adult account requirement;
- parent/guardian ownership;
- plain-language privacy summary;
- vendor/data-use explanation;
- private by default;
- no behavioral advertising using child or health data;
- consent for sensitive personalization;
- account and child-data export;
- child/account deletion;
- caregiver removal;
- session/device management;
- support contact;
- report incorrect content;
- content review date and professional attribution;
- emergency disclaimer/escalation;
- audit of who changed medicine/health records;
- terms for user-submitted photos/voice;
- clear distinction between health recording and medical guidance.

## CLP module 13: support and feedback

- searchable help;
- contact support;
- report bug;
- request feature;
- rate prediction accuracy;
- rate activities;
- report unsafe/incorrect guidance;
- refund/cancellation help;
- onboarding tips that can be dismissed;
- new-feature education without repeatedly interrupting the parent.

## Internal operational capabilities required for launch

These are not customer-facing, but the application cannot be safely operated without them.

1. Content library management.
2. Draft/review/publish workflow for activities and guidance.
3. Expert reviewer name and review date.
4. Content version history.
5. Ability to withdraw unsafe content immediately.
6. Activity/milestone targeting by age/stage.
7. Notification and lifecycle-message management.
8. Subscription/refund/coupon visibility.
9. Affiliate and creator-code tracking.
10. Customer-support account lookup with strict access controls.
11. Privacy export/deletion request processing.
12. Assistant-answer flag review.
13. Prediction/activity feedback dashboard.
14. Feature availability by country.
15. Experiment management for onboarding, trial and paywalls.
16. Incident and content-error log.

## What should not be in the launch product

Exclude these despite the larger-than-MVP strategy:

- full pregnancy experience;
- diagnosis or treatment advice;
- medicine-dose calculator;
- detailed solids/allergen guidance before expert review;
- public community/feed;
- direct messaging between unknown users;
- human expert appointments;
- physical book ordering;
- toy/product marketplace;
- ads;
- daycare/institution dashboard;
- five or more languages;
- child-facing mode;
- family location tracking;
- wearables/medical-device integrations;
- automatic interpretation of crying, photos, stools or rashes;
- gamification that scores the child against others.

These features create disproportionate complexity, liability or distraction and do not improve initial proof.

## Complete application blueprint

The following modules expand the CLP into the complete parenting platform.

## Complete module A: pregnancy

### Pregnancy profile

- due date and gestational week;
- multiple pregnancy;
- partner/caregiver connection;
- pregnancy journey type, sensitively optional;
- seamless creation of child profile after birth.

### Week-by-week journey

- baby development;
- changes for the pregnant parent;
- reviewed wellness guidance;
- partner actions;
- appointment questions;
- preparation checklist.

### Tools

- appointment calendar;
- question list;
- kick counter with appropriate safety guidance;
- contraction timer with appropriate escalation language;
- hospital bag checklist;
- birth preferences worksheet;
- baby-name shortlist;
- pregnancy memories/photos;
- private family updates;
- newborn setup before delivery.

### Commercial role

Acquire parents before they choose a newborn tracker and create a seamless birth transition.

## Complete module B: advanced sleep

- night-waking analysis;
- schedule transitions from five naps to one;
- regression guidance;
- custom sleep goals;
- routine builder;
- shared caregiver routine;
- travel/time-zone mode;
- daycare schedule mode;
- sleep environment checklist;
- personalized multi-week sleep program;
- expert-reviewed course;
- optional human sleep-consultant review later;
- toddler bedtime and nap transitions.

## Complete module C: feeding and nutrition

### Newborn feeding expansion

- milk inventory;
- pumping schedule;
- freezer/storage labels;
- formula preparation records without replacing manufacturer/medical advice;
- lactation notes;
- feeding report for professional consultation.

### Solids

- food database;
- age-appropriate preparation and serving guidance;
- allergens;
- reactions;
- foods tried/favorites;
- meal plan;
- shopping list;
- texture progression;
- cultural/regional foods;
- caregiver meal instructions;
- pediatric feeding expert review;
- export for clinician/dietitian.

## Complete module D: health organizer

- vaccination schedule by country;
- vaccine history and attachments;
- appointments;
- medicine records;
- symptoms and temperature;
- allergies;
- conditions entered by parent;
- clinician/contact directory;
- documents and lab/report storage;
- dental records/teething;
- growth references by country where appropriate;
- appointment summary;
- emergency card;
- permission-controlled sharing;
- breach and access history.

No clinical interpretation without appropriate regulatory and professional work.

## Complete module E: age 2–6 development

- toddler and preschool milestones;
- language activities;
- emotional regulation activities;
- independence/self-care;
- play and creativity;
- school-readiness activities without high-pressure scoring;
- routines and chores;
- potty training;
- screen-time goals;
- behavior reflection and parent guidance;
- sibling adjustment;
- activity plans by available time and environment;
- daycare/school notes;
- artwork and school-year memories.

## Complete module F: richer family coordination

- more granular record permissions;
- separated/co-parent household schedules;
- daycare handoff mode;
- recurring caregiver schedule;
- tasks and supply lists;
- appointment responsibility;
- family calendar;
- private grandparent digest;
- consent/change records;
- legacy/emergency contact;
- family account ownership transfer under controlled rules.

## Complete module G: trusted guidance ecosystem

- broader reviewed knowledge base;
- cited assistant answers;
- regional guidance;
- structured courses;
- expert live sessions;
- question submission;
- topic collections;
- professional directory without pay-to-rank conflicts;
- optional paid expert consultation;
- post-consult action plan;
- clear separation of education, coaching and medical care.

## Complete module H: memories, books and gifts

- unlimited family stories by plan;
- automatic weekly/monthly/yearly recap;
- original audio archive;
- child letters;
- collaborative family chapters;
- timeline themes;
- first-year book;
- annual book;
- school-year book;
- pregnancy book;
- grandparents' chapter;
- gift subscription;
- baby registry link;
- print preview/editing;
- one-country print fulfillment first;
- digital legacy/export package;
- later child handover/consent workflow.

## Complete module I: multilingual and regional experience

- full interface localization;
- reviewed content translation rather than raw automatic translation;
- original-language memory plus translation;
- regional food database;
- local measurement units;
- local vaccination/health-record configuration;
- local emergency resources;
- regional pricing;
- culturally inclusive milestones/activities;
- right-to-left support when chosen;
- translation review process.

## Complete module J: business and partnership features

- gift plans;
- affiliate/creator program;
- referral credits;
- book credits;
- expert bundles;
- employer new-parent benefit;
- photographer/doula/lactation partner codes;
- prenatal-class onboarding;
- professional content sponsorship only with visible labeling;
- no targeted advertising based on child/health information;
- later B2B caregiver/daycare tools only as a separate experience.

## Stage-adaptive behavior

### Pregnancy

Primary Today cards:

- current week;
- appointment/checklist;
- one preparation action;
- pregnancy memory.

### 0–3 months

Primary:

- feeding;
- sleep;
- diapers;
- pumping;
- caregiver handoff;
- gentle bonding activity.

### 4–6 months

Primary:

- sleep prediction;
- feeding;
- development activity;
- milestones;
- approaching-solids preparation.

### 6–12 months

Primary:

- sleep/routine;
- solids;
- allergens;
- movement/language activities;
- milestones and memories.

### 12–24 months

Primary:

- sleep and routines;
- meals;
- language/motor/social activities;
- milestones;
- funny quotes and memories.

### 2–6 years

Primary:

- daily/weekly activities;
- routines/behavior guidance;
- health and appointments;
- school/artwork memories;
- family calendar.

The transition should happen gradually with the parent's permission. Never suddenly remove a tracker the family still uses.

## Main user flows

## Flow 1: first-time parent activation

1. Select child age and main goal.
2. Configure only relevant trackers.
3. See personalized Today plan.
4. Log first event or view first activity.
5. Invite co-parent.
6. Start premium trial after seeing prediction/plan value.

Success event: first log plus either an invite or premium-plan interaction.

## Flow 2: 3 a.m. feeding

1. Open app/widget.
2. Start breast/bottle timer in one tap.
3. Stop and optionally add amount/note.
4. App updates Today and partner timeline.
5. No article, upsell or survey interrupts the task.

## Flow 3: sleep prediction

1. Parent logs sleep.
2. Today shows next likely nap.
3. Reminder appears before wind-down.
4. Parent marks prediction early/accurate/late.
5. Schedule adjusts.
6. Weekly insight demonstrates value.

## Flow 4: development activity

1. Today displays activity.
2. Parent sees material, duration and steps.
3. Complete, skip or replace.
4. Parent can note what happened.
5. Activity contributes to weekly domain balance.
6. Optional photo/note becomes memory.

## Flow 5: caregiver handoff

1. Caregiver finishes shift.
2. App summarizes feeds, sleep, diapers, medicines and notes.
3. Parent receives one digest rather than multiple messages.
4. Parent can open details.

## Flow 6: milestone to memory

1. Parent marks milestone observed.
2. App asks whether to add date/photo/voice.
3. Entry appears in Journey.
4. It becomes eligible for monthly/annual story.

## Flow 7: subscription conversion

1. Parent experiences a real prediction or weekly plan.
2. Contextual premium screen explains the outcome unlocked.
3. Seven-day trial starts.
4. Parent receives value reminders, not generic marketing.
5. Clear pre-charge reminder.
6. If declined, free logs and family data remain available.

## Content production plan

AI can accelerate drafts, but expert review is mandatory for safety-sensitive material.

### Launch content inventory

| Content | Launch quantity | Owner/reviewer |
|---|---:|---|
| Development activities | 200+ | Child-development/early-learning reviewer |
| Milestone observations | 250+ | Pediatric/development reviewer |
| Monthly stage summaries | 24 | Pediatric/development reviewer |
| Sleep guides | 30 | Sleep professional plus medical review where needed |
| Sleep routine templates | 15 | Sleep professional |
| Development guides | 40 | Early-childhood reviewer |
| Memory prompts | 100 | Editorial review |
| Assistant safe-answer topics | 100+ intents | Relevant expert plus safety review |
| Help/support articles | 50 | Product/support owner |

### Content workflow

1. Define source and intended age/stage.
2. Draft.
3. Expert review.
4. Safety/legal wording review for sensitive topics.
5. Publish with reviewer/date.
6. Collect feedback.
7. Re-review on a fixed schedule or when guidance changes.

## Fourteen-week CLP schedule

This schedule assumes both founders are full-time and use AI extensively, while content/expert review runs in parallel.

### Weeks 1–2: product and content foundation

- final product flows and screen hierarchy;
- 30 parent interviews/usability sessions scheduled;
- onboarding and Today prototype;
- content templates and source policy;
- hire/contract reviewers;
- privacy/health boundary workshop;
- pricing and trial experiment plan.

### Weeks 3–5: daily-care foundation

- onboarding;
- child/family profiles;
- Today shell;
- tracking categories;
- timeline;
- active timers;
- caregiver invitation and sync;
- notifications/reminders;
- first 50 activities and milestone set imported/reviewed.

### Weeks 6–7: premium sleep system

- baseline schedule;
- next nap/bedtime;
- wake-window view;
- prediction feedback;
- sleep trends;
- routine content;
- first contextual premium moment.

### Weeks 8–9: development system

- milestone domains/status;
- activity library;
- daily/weekly plan;
- complete/skip/replace;
- monthly stage summary;
- content review progress to full launch quantity.

### Weeks 10–11: insights, memories and assistant

- daily/weekly summaries;
- advanced report foundation;
- memory capture and recap;
- milestone-to-memory flow;
- restricted assistant;
- natural-language logging confirmation;
- export.

### Week 12: monetization and trust

- subscription plans;
- seven-day trial;
- contextual paywalls;
- cancellation/free fallback;
- privacy controls;
- deletion/export verification;
- content attribution and reporting;
- support flows.

### Week 13: closed beta

- 50–100 families;
- at least 20 co-parent pairs;
- newborn and older-infant cohorts;
- daily bug/feedback review;
- prediction feedback;
- measure first-session completion and logging speed;
- test content clarity and safety.

### Week 14: launch hardening

- fix data/sync/timer issues first;
- remove or disable unsafe/unfinished features;
- paywall and trial clarity review;
- privacy/legal review;
- store listing and screenshots by acquisition goal;
- support response process;
- staged public launch.

If the content or safety review is incomplete, extend to 16 weeks rather than ship unreviewed guidance.

## Work allocation for two founders

### Founder A: core care and family experience

- onboarding and profiles;
- trackers/timers/timeline;
- family/caregiver collaboration;
- notifications;
- data trust/export;
- reliability and beta triage.

### Founder B: premium and growth experience

- Today plan;
- sleep prediction/schedule;
- development plan/activities;
- insights/memories/assistant;
- subscription/paywalls;
- content operations and acquisition experiments.

Both founders:

- parent interviews;
- weekly product review;
- support during beta;
- content/safety decisions;
- metrics and continue/stop decisions.

At least one founder should spend 30–40% of time on users, content and growth even during development.

## Launch quality gates

Do not launch publicly until all are true:

### Core usability

- first log can be completed within two minutes of account creation;
- common timer starts from Today in one action;
- parent can correct any entry;
- partner sees new care information reliably;
- no subscription required to recover/export basic data;
- quiet-hours and notification controls work clearly.

### Content and safety

- every activity and milestone has source/review status;
- no unreviewed medical/development claims;
- assistant refuses disallowed topics appropriately;
- emergency language reviewed;
- growth/milestone displays do not diagnose;
- privacy and deletion process tested end to end.

### Beta behavior

- 70% of testers complete first log/activity;
- 40% invite a caregiver;
- 40% active in week two;
- at least 30% use both tracking and Plan;
- at least 20% start the premium trial;
- trial confusion/refund complaints are low;
- no recurring loss, duplication or incorrect attribution of family records.

## Post-launch metrics

### North-star metric

**Families receiving value from at least two modules each week.**

Examples:

- tracking plus sleep prediction;
- tracking plus development activity;
- development plus memory;
- tracking plus caregiver handoff.

This is more important than raw app opens.

### Activation

- child profile complete: 85%+;
- first useful action: 70%+;
- co-parent invite: 35–45%;
- first prediction/plan viewed: 50%+.

### Retention

- day 7 family active: 40%+;
- week 4 family active: 30%+;
- month 3 active: 20%+;
- two-module weekly use among retained families: 30%+.

### Monetization

- activated user to trial: 10–20%;
- trial to paid: 25%+;
- overall download to paid: 2% baseline, 4% strong;
- refunds below 5%;
- annual plan majority of purchases;
- early CAC target below US$25 for US$79 annual plan.

### Quality

- activity helpful rating above 80%;
- prediction “accurate or useful” above 70% after sufficient history;
- support response within one business day during launch;
- content safety reports resolved rapidly;
- caregiver sync complaints treated as highest severity.

## Post-launch roadmap

### Release 1.1: first 4–8 weeks

- correct highest-friction tracking flows;
- improve sleep prediction from feedback;
- add 40–60 activities;
- advanced family handoff;
- more useful weekly reports;
- first referral credit;
- targeted onboarding by acquisition campaign;
- one additional language only if justified.

### Release 1.2: months 3–5

- solids starter module;
- food-introduction log;
- health organizer basics;
- printable doctor report;
- richer assistant with reviewed feeding content;
- toddler transition experience;
- digital annual story.

### Release 2: months 6–9

- pregnancy acquisition journey;
- full solids/allergen content;
- advanced health records;
- toddler routines/potty;
- multiple-country content settings;
- gift subscription;
- book preorder/pilot.

### Release 3: months 10–15

- age 2–6 plan;
- school/artwork memories;
- human experts or courses;
- employer/partner offering;
- print expansion;
- second/third major language;
- professional and caregiver extensions where demand is proven.

## Final scope recommendation

The first public product should feel complete in four interconnected areas:

1. Care tracking and family coordination.
2. Sleep prediction and routine planning.
3. Development activities and milestones.
4. Memories and weekly recaps.

It should also include a restricted assistant, insights, subscriptions, privacy controls and the operational systems required to run trusted parenting content.

That is not a basic MVP. It is a competitive product with a clear paid reason, daily utility and long-term retention. At the same time, it avoids pregnancy, medical diagnosis, full nutrition, community, experts and physical books until the foundation proves itself.

**Recommended build commitment: 14 weeks to staged launch, with a 16-week maximum if expert review or beta quality requires it. Build the broad foundation, but win the market initially through one simple promise: a calm plan for what happened, what comes next and what matters today.**
