#!/usr/bin/env python3
"""Generate MSE800 Assessment 2 Project Report PDF for FixItPublic."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

# ── Colours ───────────────────────────────────────────────────────────────────
NAVY    = HexColor('#0F172A')
GOLD    = HexColor('#B8860B')
SLATE   = HexColor('#64748B')
LIGHT   = HexColor('#F8FAFC')
BORDER  = HexColor('#CBD5E1')
GREEN   = HexColor('#15803D')
BLUE_BG = HexColor('#EFF6FF')
BLUE_TX = HexColor('#1E3A5F')
YEL_BG  = HexColor('#FFFBEB')
YEL_TX  = HexColor('#713F12')

OUTPUT = '/Users/rukshandesilva/Desktop/FixItPublic/FixItPublic-main/docs/MSE800_FixItPublic_Project_Report.pdf'
W = A4[0] - 4 * cm   # usable width ≈ 17 cm


# ── Styles ────────────────────────────────────────────────────────────────────
def make_styles():
    s = getSampleStyleSheet()

    def add(name, **kw):
        s.add(ParagraphStyle(name=name, **kw))

    add('CoverTitle',  fontName='Helvetica-Bold', fontSize=30, textColor=NAVY,  alignment=TA_CENTER, spaceAfter=6,  leading=36)
    add('CoverSub',    fontName='Helvetica',      fontSize=13, textColor=SLATE, alignment=TA_CENTER, spaceAfter=5)
    add('CoverLabel',  fontName='Helvetica-Bold', fontSize=9,  textColor=SLATE, alignment=TA_CENTER, spaceAfter=2)
    add('CoverValue',  fontName='Helvetica',      fontSize=9,  textColor=NAVY,  alignment=TA_CENTER, spaceAfter=6)
    add('SecNum',      fontName='Helvetica-Bold', fontSize=18, textColor=GOLD,  spaceBefore=4, spaceAfter=1)
    add('SecTitle',    fontName='Helvetica-Bold', fontSize=16, textColor=NAVY,  spaceBefore=1, spaceAfter=8)
    add('H2',          fontName='Helvetica-Bold', fontSize=13, textColor=NAVY,  spaceBefore=10, spaceAfter=5)
    add('H3',          fontName='Helvetica-Bold', fontSize=11, textColor=NAVY,  spaceBefore=7,  spaceAfter=3)
    add('Body',        fontName='Helvetica',      fontSize=10, textColor=HexColor('#1E293B'),
                       spaceAfter=6, leading=15, alignment=TA_JUSTIFY)
    add('BulletItem',  fontName='Helvetica',      fontSize=10, textColor=HexColor('#1E293B'),
                       spaceAfter=4, leading=14, leftIndent=14, firstLineIndent=-8)
    add('Caption',     fontName='Helvetica-Oblique', fontSize=9, textColor=SLATE,
                       alignment=TA_CENTER, spaceAfter=8, spaceBefore=2)
    add('TH',          fontName='Helvetica-Bold', fontSize=9, textColor=white,  alignment=TA_CENTER)
    add('TD',          fontName='Helvetica',      fontSize=9, textColor=NAVY,   alignment=TA_LEFT,   leading=13)
    add('TDC',         fontName='Helvetica',      fontSize=9, textColor=NAVY,   alignment=TA_CENTER, leading=13)
    add('CodeBlock',   fontName='Courier',        fontSize=8, textColor=NAVY,
                       spaceAfter=5, leading=11, backColor=LIGHT, leftIndent=8, borderPad=5)
    add('Info',        fontName='Helvetica',      fontSize=10, textColor=BLUE_TX,
                       spaceAfter=6, leading=14, backColor=BLUE_BG, leftIndent=12, borderPad=8)
    return s


S = make_styles()


# ── Helpers ───────────────────────────────────────────────────────────────────
def hr(thick=1, color=BORDER):
    return HRFlowable(width='100%', thickness=thick, color=color, spaceAfter=6, spaceBefore=6)


def sec(num, title):
    return [Paragraph(num, S['SecNum']), Paragraph(title, S['SecTitle']), hr(2, GOLD), Spacer(1, 4)]


BASE_TBL = TableStyle([
    ('BACKGROUND',   (0, 0), (-1, 0),  NAVY),
    ('ROWBACKGROUNDS',(0, 1), (-1,-1), [white, LIGHT]),
    ('BOX',          (0, 0), (-1,-1),  1, BORDER),
    ('INNERGRID',    (0, 0), (-1,-1),  0.5, BORDER),
    ('TOPPADDING',   (0, 0), (-1,-1),  5),
    ('BOTTOMPADDING',(0, 0), (-1,-1),  5),
    ('LEFTPADDING',  (0, 0), (-1,-1),  6),
    ('RIGHTPADDING', (0, 0), (-1,-1),  6),
    ('VALIGN',       (0, 0), (-1,-1),  'TOP'),
])


def tbl(rows, widths, extra=None):
    """Build a table from plain-string row data with auto TH/TD styling."""
    para_rows = []
    for i, row in enumerate(rows):
        para_rows.append([
            Paragraph(str(cell), S['TH'] if i == 0 else S['TD'])
            for cell in row
        ])
    t = Table(para_rows, colWidths=widths)
    style = TableStyle(BASE_TBL.getCommands())
    if extra:
        for cmd in extra:
            style.add(*cmd)
    t.setStyle(style)
    return t


# ══════════════════════════════════════════════════════════════════════════════
def build():
    doc = SimpleDocTemplate(
        OUTPUT, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
        title='FixItPublic — MSE800 Assessment 2 Project Report',
        author='Nirmal Unagalle & Rukshan De Silva',
    )
    story = []

    # ── COVER PAGE ────────────────────────────────────────────────────────────
    story.append(Spacer(1, 1.5*cm))
    bar = Table([['  FixItPublic']], colWidths=[W])
    bar.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), GOLD),
        ('TEXTCOLOR',     (0,0), (-1,-1), white),
        ('FONTNAME',      (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE',      (0,0), (-1,-1), 24),
        ('TOPPADDING',    (0,0), (-1,-1), 14),
        ('BOTTOMPADDING', (0,0), (-1,-1), 14),
    ]))
    story.append(bar)
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph('Civic Issue Reporting Platform', S['CoverSub']))
    story.append(Spacer(1, 1.2*cm))
    story.append(Paragraph('MSE800 Professional Software Engineering', S['CoverLabel']))
    story.append(Paragraph('Assessment 2 — Object-Oriented Project (Group)', S['CoverSub']))
    story.append(Spacer(1, 1.5*cm))

    meta_rows = [
        ('Programme',      'Master of Software Engineering'),
        ('Course',         'MSE800 Professional Software Engineering (Level 8, 30 Credits)'),
        ('Team Members',   'Nirmal Unagalle  ·  Rukshan De Silva'),
        ('Repository',     'github.com/Nirmal-C/FixItPublic'),
        ('Submission',     'March 2026'),
    ]
    mt = Table(
        [[Paragraph(k, S['CoverLabel']), Paragraph(v, S['CoverValue'])] for k, v in meta_rows],
        colWidths=[4*cm, W-4*cm],
    )
    mt.setStyle(TableStyle([
        ('VALIGN',       (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING',(0,0), (-1,-1), 7),
        ('TOPPADDING',   (0,0), (-1,-1), 3),
        ('LINEBELOW',    (0,0), (-1,-2), 0.5, BORDER),
    ]))
    story.append(mt)
    story.append(Spacer(1, 1.5*cm))

    tt_box = Table([[
        Paragraph('<b>Te Tiriti o Waitangi Commitment</b>', S['H3'])
    ], [
        Paragraph(
            'This project is developed in the spirit of Te Tiriti o Waitangi through its three principles: '
            '<b>Partnership</b> — collaborative team and community-informed design; '
            '<b>Participation</b> — bilingual UI (English / Te Reo Māori), Māori-specific issue categories; '
            '<b>Protection</b> — Cultural Guardian module that cross-references Wāhi Tapu (sacred sites) '
            'to protect culturally significant land from unreviewed maintenance dispatches.',
            S['Body'],
        )
    ]], colWidths=[W])
    tt_box.setStyle(TableStyle([
        ('BOX',           (0,0), (-1,-1), 1.5, GOLD),
        ('BACKGROUND',    (0,0), (-1,0),  HexColor('#FEF3C7')),
        ('BACKGROUND',    (0,1), (-1,1),  YEL_BG),
        ('TOPPADDING',    (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING',   (0,0), (-1,-1), 12),
        ('RIGHTPADDING',  (0,0), (-1,-1), 12),
    ]))
    story.append(tt_box)
    story.append(PageBreak())

    # ── 1. EXECUTIVE SUMMARY ──────────────────────────────────────────────────
    story += sec('1', 'Executive Summary')
    story.append(Paragraph(
        'FixItPublic is a full-stack civic issue reporting platform developed for New Zealand local councils. '
        'Citizens report public infrastructure problems (potholes, broken streetlights, graffiti, flooding, etc.) '
        'through a web application. Reports are routed to appropriate maintenance crews, tracked through resolution, '
        'and made transparent to the community via a public map. A GPT-4o AI engine analyses each submission in the '
        'background to confirm crew assignment, assess escalation risk, and generate a decision summary. '
        'The platform is bilingual (English / Te Reo Māori) and includes a Cultural Guardian module that '
        'cross-references Wāhi Tapu (sacred Māori sites) to protect culturally sensitive locations.',
        S['Body']))
    story.append(tbl(
        [
            ['Metric', 'Value'],
            ['Platform Type',      'Full-stack web application (SaaS)'],
            ['Frontend Stack',     'React 18 + Vite + Tailwind CSS + React Router v6'],
            ['Backend Stack',      'Django 4 + Django REST Framework + SimpleJWT'],
            ['Database / Storage', 'PostgreSQL on Azure + Azure Blob Storage'],
            ['AI Integration',     'GPT-4o for ticket analysis, crew assignment, escalation assessment'],
            ['Sprints Completed',  '4 Sprints × 2 weeks (8 weeks total)'],
            ['QA Test Results',    '28 / 28 test cases PASSED (100% — Sprint 1–4 System Verification)'],
            ['Deployment',         'Azure Kubernetes Service (AKS) via GitHub Actions CI/CD'],
            ['Cultural Features',  'Bilingual UI, Wāhi Tapu protection, Te Reo Māori issue categories'],
        ],
        [5*cm, W-5*cm],
    ))
    story.append(Paragraph('Table 1.1 — Project Key Metrics', S['Caption']))
    story.append(PageBreak())

    # ── 2. TEAM FORMATION ─────────────────────────────────────────────────────
    story += sec('2', 'Team Formation')
    story.append(Paragraph(
        'The team consists of two Master of Software Engineering students with complementary skill sets. '
        'Formation followed the Te Tiriti o Waitangi <b>Partnership</b> principle — both members hold equal '
        'decision-making authority and diverse perspectives are actively sought and respected.',
        S['Body']))
    story.append(tbl(
        [
            ['Member',              'Primary Role',               'Responsibilities',                              'Te Tiriti Contribution'],
            ['Nirmal\nUnagalle',    'Backend Lead\nDevOps Eng.',  'Django REST API, PostgreSQL schema,\nAzure infrastructure, CI/CD,\nGPT-4o AI integration', 'Participation: Māori issue categories\nCultural Guardian backend logic'],
            ['Rukshan\nDe Silva',   'Frontend Lead\nQA Engineer', 'React/Vite UI, Citizen & Admin dashboards,\nGoogle Maps, QA testing,\nPython decorators (Sprint 4)', 'Partnership: Bilingual UI (Te Reo Māori)\nWāhi Tapu protection frontend'],
        ],
        [3*cm, 3*cm, 5.5*cm, 5.5*cm],
    ))
    story.append(Paragraph('Table 2.1 — Team Roles and Responsibilities', S['Caption']))

    story.append(Paragraph('Te Tiriti o Waitangi — Partnership in Practice', S['H2']))
    story.append(Paragraph(
        'A Kaiārahi was consulted during the requirements phase to ensure the platform respectfully serves '
        'Māori communities. This consultation resulted in: Te Reo Māori label subtitles throughout the UI; '
        'culturally appropriate issue category names; the Cultural Guardian backend module; and anonymous '
        'submission support to respect cultural privacy norms. Sprint ceremonies explicitly included a cultural '
        'lens checkpoint to verify these commitments were maintained across all deliverables.',
        S['Body']))

    story.append(tbl(
        [
            ['Tool',                              'Purpose'],
            ['GitHub (Nirmal-C/FixItPublic)',      'Version control, code review, issue history'],
            ['Git branches (rukshan / nirmal)',    'Feature isolation; --no-ff merges into main'],
            ['Semantic versioning (v1→v2)',        'Clear release tagging and changelog'],
            ['Docker Compose',                    'Consistent local dev environment for both members'],
            ['Azure Kubernetes Service',           'Shared staging / production deployment'],
        ],
        [6.5*cm, W-6.5*cm],
    ))
    story.append(Paragraph('Table 2.2 — Collaboration Tools', S['Caption']))
    story.append(PageBreak())

    # ── 3. PROJECT KICKOFF MEETING ────────────────────────────────────────────
    story += sec('3', 'Project Kickoff Meeting')
    story.append(Paragraph(
        'The project kickoff meeting was held in Week 1. The goal was to establish scope, agree on roles, '
        'identify stakeholders, and integrate a cultural lens from day one.',
        S['Body']))

    story.append(tbl(
        [
            ['#', 'Agenda Item',                              'Outcome'],
            ['1',  'Project scope and objectives',            'Civic issue reporting portal for NZ councils'],
            ['2',  'Stakeholder identification',              'Citizens, council admins, maintenance crews, Māori community'],
            ['3',  'Technology stack selection',              'React + Django + PostgreSQL + Azure AKS'],
            ['4',  'Te Tiriti o Waitangi integration',        'Bilingual UI, Wāhi Tapu protection, Kaiārahi consultation'],
            ['5',  'Sprint planning overview',                '4 × 2-week sprints; GitHub for version control'],
            ['6',  'Role assignment',                         'Nirmal: Backend/DevOps | Rukshan: Frontend/QA'],
            ['7',  'Risk identification',                     'API rate limits, Azure costs, cultural sensitivity'],
        ],
        [0.8*cm, 6*cm, W-6.8*cm],
    ))
    story.append(Paragraph('Table 3.1 — Kickoff Meeting Agenda and Outcomes', S['Caption']))

    story.append(Paragraph('Initial Requirements Identified at Kickoff', S['H2']))
    story.append(tbl(
        [
            ['Stakeholder', 'Initial Requirement'],
            ['Citizen',  'Report infrastructure issues with photo, GPS location, and description'],
            ['Citizen',  'Track submitted reports and receive email status updates'],
            ['Admin',    'View all reports on an interactive map and assign to maintenance crews'],
            ['Admin',    'View AI-generated crew recommendations and escalation decisions'],
            ['System',   'Automatically analyse each ticket using GPT-4o (background thread)'],
            ['System',   'Cross-reference report location against Wāhi Tapu database'],
            ['System',   'Bilingual interface (English and Te Reo Māori throughout)'],
        ],
        [3*cm, W-3*cm],
    ))
    story.append(Paragraph('Table 3.2 — Initial Requirements Identified at Kickoff', S['Caption']))
    story.append(PageBreak())

    # ── 4. REQUIREMENT GATHERING MEETINGS ─────────────────────────────────────
    story += sec('4', 'Requirement Gathering Meetings')
    story.append(Paragraph(
        'Three formal requirement gathering meetings were conducted across Weeks 1–3, targeting a specific '
        'stakeholder group per meeting. Outcomes were added directly to the product backlog.',
        S['Body']))

    meetings = [
        ('4.1  Meeting 1 — Citizen Requirements (Week 1)',
         'Development team + simulated citizen stakeholder group',
         ['Multi-step report form: GPS location, photo upload, category, description',
          'Anonymous submission — no account required for basic reporting',
          'Email notifications on ticket status changes (opt-in at registration)',
          'Mobile-responsive interface for on-the-go reporting',
          'View own submitted tickets with current status and history',
          'GPS auto-fill via browser Geolocation API for convenience']),
        ('4.2  Meeting 2 — Admin & Council Requirements (Week 2)',
         'Development team + simulated council administrator',
         ['Admin dashboard: ticket list with sorting and filtering by status/category',
          'Interactive map showing all tickets as colour-coded pins by category',
          'Crew assignment system with AI-recommended crew based on issue type',
          'User management: create, edit, delete council staff accounts',
          'Statistics dashboard: resolution rates, average response times, SLA metrics',
          'AI Log page showing GPT-4o decision reasoning for each ticket']),
        ('4.3  Meeting 3 — Cultural & Technical Requirements (Week 3)',
         'Development team + Kaiārahi (cultural consultant)',
         ['Bilingual UI: English labels with Te Reo Māori subtitles throughout',
          'Cultural Guardian: cross-reference report GPS against Wāhi Tapu database',
          'Flag tickets near culturally sensitive sites for human review before dispatch',
          'Anonymous participation supported to respect Māori privacy preferences',
          'Secure token-based auth with JWT rotating refresh tokens',
          'Azure cloud deployment for New Zealand data sovereignty']),
    ]
    for title, attendees, outcomes in meetings:
        story.append(Paragraph(title, S['H2']))
        story.append(Paragraph(f'<b>Attendees:</b> {attendees}', S['Body']))
        for o in outcomes:
            story.append(Paragraph(f'• {o}', S['BulletItem']))
        story.append(Spacer(1, 4))
    story.append(PageBreak())

    # ── 5. REQUIREMENT ANALYSIS AND PRIORITISATION ────────────────────────────
    story += sec('5', 'Requirement Analysis and Prioritisation')
    story.append(Paragraph(
        'Requirements were analysed and prioritised using the MoSCoW framework to ensure '
        'highest-value features were delivered first, guided by business and community impact.',
        S['Body']))

    moscow_rows = [
        ['Priority', 'Requirement',                                              'Justification'],
        ['MUST',     'Citizen issue report (photo, GPS, category, description)', 'Core product function'],
        ['MUST',     'Admin ticket management (view, assign, update status)',    'Council workflow dependency'],
        ['MUST',     'JWT auth with role-based access (citizen/admin/superuser)','Security requirement'],
        ['MUST',     'Email notifications for ticket events',                    'Citizen transparency'],
        ['MUST',     'Bilingual UI (English / Te Reo Māori)',                   'Te Tiriti obligation'],
        ['SHOULD',   'GPT-4o AI ticket analysis and crew recommendation',       'Efficiency improvement'],
        ['SHOULD',   'Interactive Google Maps with colour-coded pins',          'Visual transparency'],
        ['SHOULD',   'Citizen profile management and avatar upload',            'User experience'],
        ['SHOULD',   'Password change and forgot/reset password flow',          'User self-service'],
        ['COULD',    'Wāhi Tapu Cultural Guardian cross-reference',             'Cultural protection (planned)'],
        ['COULD',    'Spatial deduplication (50 m radius clustering)',          'Data quality (planned)'],
        ['COULD',    'PWA offline mode for low-connectivity areas',             'Accessibility (planned)'],
        ["WON'T",    'Native mobile application (iOS/Android)',                 'Web platform is sufficient for MVP'],
    ]
    priority_colours = {
        'MUST': HexColor('#DCFCE7'), 'SHOULD': HexColor('#DBEAFE'),
        'COULD': HexColor('#FEF9C3'), "WON'T": HexColor('#FEE2E2'),
    }
    extra = [('BACKGROUND', (0, i), (0, i), priority_colours.get(r[0], white))
             for i, r in enumerate(moscow_rows[1:], 1)]
    story.append(tbl(moscow_rows, [2*cm, 8*cm, W-10*cm], extra=extra))
    story.append(Paragraph('Table 5.1 — MoSCoW Requirement Prioritisation', S['Caption']))

    story.append(Paragraph('User Stories', S['H2']))
    story.append(tbl(
        [
            ['ID',    'As a…',  'I want to…',                                        'So that…',                                  'Priority'],
            ['US01',  'Citizen','Report a pothole with GPS and a photo',              'The council can find and fix it quickly',    'MUST'],
            ['US02',  'Citizen','Receive email when my report status changes',        'I know my issue is being addressed',         'MUST'],
            ['US03',  'Citizen','Submit a report without creating an account',        'Participation is as frictionless as possible','MUST'],
            ['US04',  'Citizen','View a public map of all reported issues',           'I can see what problems are managed',        'SHOULD'],
            ['US05',  'Admin',  'Assign tickets to specific maintenance crews',       'The right team handles each issue',          'MUST'],
            ['US06',  'Admin',  'See AI-recommended crew and escalation decision',    'I can make faster, informed decisions',      'SHOULD'],
            ['US07',  'Admin',  'View detailed stats on resolution rates',            'I can report performance to council',        'SHOULD'],
            ['US08',  'System', 'Cross-reference reports against Wāhi Tapu sites',   'Sacred Māori land is protected',             'COULD'],
        ],
        [1.2*cm, 2*cm, 5*cm, 4.5*cm, 1.8*cm],
    ))
    story.append(Paragraph('Table 5.2 — User Stories', S['Caption']))
    story.append(PageBreak())

    # ── 6. AGILE DEVELOPMENT SPRINTS ──────────────────────────────────────────
    story += sec('6', 'Agile Development Sprints')
    story.append(Paragraph(
        'Development followed a Scrum-based agile methodology across four two-week sprints. '
        'Each sprint included a planning meeting, asynchronous daily standups, and a retrospective. '
        'Git branch-per-feature strategy was enforced; all merges to main required a pull request review.',
        S['Body']))

    story.append(tbl(
        [
            ['Sprint',    'Weeks',    'Theme',              'Key Deliverables',                              'Status'],
            ['Sprint 1',  'Wks 1–2',  'Foundation',         'Auth, registration, basic ticket form',         'Complete'],
            ['Sprint 2',  'Wks 3–4',  'Core Features',      'Admin dashboard, Google Maps, email notifs',    'Complete'],
            ['Sprint 3',  'Wks 5–6',  'Intelligence',       'GPT-4o AI, avatar upload, profile management',  'Complete'],
            ['Sprint 4',  'Wks 7–8',  'Quality & Standards','QA fixes, Python decorators, performance',      'Complete'],
        ],
        [1.8*cm, 2*cm, 3*cm, 6.5*cm, 2.2*cm],
    ))
    story.append(Paragraph('Table 6.1 — Sprint Overview', S['Caption']))

    sprints = [
        ('6.1  Sprint 1 — Foundation (Weeks 1–2)', [
            ('Authentication System', [
                'Custom User model: three roles (citizen, admin, superuser)',
                'JWT access tokens (60-min) + rotating refresh tokens (7-day blacklisting)',
                'Separate citizen and admin login portals; admin accounts blocked from citizen portal',
                'PrivateRoute guard in React: unauthenticated access to /dashboard redirects to /login',
            ]),
            ('Citizen Registration & Ticket Submission', [
                'Registration with password strength validation (uppercase + number enforced)',
                'Multi-step report form: GPS location, category, description, up to 5 photos',
                'Anonymous submission supported — no account required',
                'Browser Geolocation API for automatic GPS coordinate fill',
            ]),
            ('Backend Infrastructure', [
                'Django REST Framework with modular API (views, serializers, models, permissions)',
                'PostgreSQL schema: User, MaintenanceTicket, AILog models with full migrations',
                'Rate throttling: 5/hr registration, 10/hr anonymous ticket creation',
                'GitHub repository initialised; rukshan and nirmal branches created',
            ]),
        ]),
        ('6.2  Sprint 2 — Core Features (Weeks 3–4)', [
            ('Admin Dashboard', [
                'Ticket list with sorting, filtering by status and category',
                'Ticket workflow: pending → in_progress → resolved → closed',
                'Crew assignment with CATEGORY_CREW_MAP intelligent suggestion',
                'User management: create, edit, delete admin/citizen accounts',
            ]),
            ('Google Maps Integration', [
                'Public map: colour-coded pins by issue category, filterable, info windows',
                'Admin map: full detail pins with crew/reporter info, escalation badges, status-change buttons',
                'LocationPickerModal for precise GPS selection on report form',
                'Dark/light theme map styling; async Maps JS API load',
            ]),
            ('Email Notifications', [
                'SMTP via Namecheap Private Email (port 587, TLS)',
                'Four event types: welcome, sign-in notification, ticket created, status update',
                'HTML templates with FixIt branding; gated on user.email_notifications',
                'Opt-in checkbox on registration form with correct CSS theme-aware border',
            ]),
        ]),
        ('6.3  Sprint 3 — Intelligence (Weeks 5–6)', [
            ('GPT-4o AI Integration', [
                'Django post_save signal on MaintenanceTicket triggers GPT-4o in background thread',
                'AI confirms/reassigns crew, assesses escalation, writes summary + reasoning + confidence',
                'AILog table (one-to-one with ticket) stores all decisions for admin review',
                'Admin AI Log page: filter by status, view full reasoning JSON per ticket',
                'Graceful degradation: skips if OPENAI_API_KEY absent; error logged to AILog',
            ]),
            ('Profile & Avatar Management', [
                'Avatar stored in Azure Blob Storage (avatars/ prefix); old blob deleted on re-upload',
                'GET /api/auth/avatar/ proxy endpoint streams blob bytes — avoids SAS URL expiry',
                'Cross-user avatar leak prevented by clearing C_PROFILE cache key on each login',
                'Password change with strength indicator; profile editing persists to database',
            ]),
            ('Deployment & Infrastructure', [
                'Docker Compose for consistent local development across both team members',
                'Azure Kubernetes Service: django-backend and react-frontend deployments',
                'GitHub Actions CI/CD: Docker build → push to ACR → AKS rolling deploy on main push',
                'All secrets managed via Kubernetes Secrets; PostgreSQL SSL enforced',
            ]),
        ]),
        ('6.4  Sprint 4 — Quality & Standards (Weeks 7–8)', [
            ('QA Testing & Bug Fixes', [
                'Full Sprint 1–4 QA checklist: 28 test cases, 100% pass rate',
                'Password toggle re-mask fix: key prop forces DOM re-mount of input element',
                'PrivateRoute guard verified: unauthenticated /dashboard access redirects immediately',
                'Checkbox border fixed: CSS variable var(--border, #cbd5e1) works in both light/dark themes',
                'Avatar cache-control headers prevent cross-user browser caching (commit d9cc26d)',
            ]),
            ('Python Decorators (MSE800 Criterion)', [
                '@log_request — logs method, path, user, status code, execution time via Django logger',
                '@require_council_role — returns HTTP 403 if caller is not council admin/superuser',
                '@cache_response(timeout) — caches JSON response; X-Cache: HIT/MISS header for transparency',
                'Applied to map_tickets, admin_stats, and public_stats views respectively',
                'Follows Single Responsibility, DRY, and Open/Closed design principles',
            ]),
        ]),
    ]
    for sprint_title, sections in sprints:
        story.append(Paragraph(sprint_title, S['H2']))
        for section_title, items in sections:
            story.append(Paragraph(section_title, S['H3']))
            for item in items:
                story.append(Paragraph(f'• {item}', S['BulletItem']))
        story.append(Spacer(1, 6))
    story.append(PageBreak())

    # ── 7. COST ESTIMATION ────────────────────────────────────────────────────
    story += sec('7', 'Cost Estimation')
    story.append(Paragraph(
        'Cost estimation covers labour, cloud infrastructure, and third-party services. '
        'All figures are in New Zealand Dollars (NZD). Student rates applied for labour.',
        S['Body']))

    story.append(Paragraph('Labour', S['H2']))
    story.append(tbl(
        [
            ['Member',          'Role',                   'Hours', 'Rate (NZD/hr)', 'Total (NZD)'],
            ['Nirmal Unagalle', 'Backend Lead / DevOps',  '120',   '$45',           '$5,400'],
            ['Rukshan De Silva','Frontend Lead / QA',     '120',   '$45',           '$5,400'],
            ['',                'Total Labour',           '240',   '',              '$10,800'],
        ],
        [4.5*cm, 4*cm, 2*cm, 2.5*cm, W-13*cm],
        extra=[('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
               ('BACKGROUND', (0, 3), (-1, 3), LIGHT)],
    ))
    story.append(Paragraph('Table 7.1 — Labour Cost Breakdown', S['Caption']))

    story.append(Paragraph('Infrastructure & Services', S['H2']))
    story.append(tbl(
        [
            ['Service',                       'Provider',  'Usage',                        '$/month', 'Total (2 mo)'],
            ['Azure Kubernetes Service',        'Azure',    'B2s nodes (dev/staging)',       '$60',     '$120'],
            ['Azure PostgreSQL Flexible Server','Azure',    'Burstable tier',                '$40',     '$80'],
            ['Azure Blob Storage',             'Azure',    'Photos + avatars (~5 GB)',       '$5',      '$10'],
            ['OpenAI GPT-4o API',              'OpenAI',   '~200 ticket analyses',          '$25',     '$50'],
            ['Google Maps Platform',           'Google',   'Maps JS API + Geocoding',       '$10',     '$20'],
            ['Domain + Email Hosting',         'Namecheap','fixitpublic.co.nz + SMTP',      '$8',      '$16'],
            ['GitHub + Docker Hub',            'Free',     'Open source tiers',             '$0',      '$0'],
            ['',                               '',         'Total Infrastructure',          '',        '$296'],
        ],
        [4.5*cm, 2.5*cm, 3.5*cm, 1.8*cm, W-12.3*cm],
        extra=[('FONTNAME', (0, 8), (-1, 8), 'Helvetica-Bold'),
               ('BACKGROUND', (0, 8), (-1, 8), LIGHT)],
    ))
    story.append(Paragraph('Table 7.2 — Infrastructure and Service Costs', S['Caption']))

    story.append(tbl(
        [
            ['Cost Category',                                               'NZD'],
            ['Labour (240 hrs × $45/hr)',                                   '$10,800'],
            ['Cloud infrastructure (2 months)',                             '$296'],
            ['Total Project Cost',                                          '$11,096'],
            ['Professional market rate equivalent ($120/hr + infra)',       '$29,096'],
        ],
        [12*cm, W-12*cm],
        extra=[('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
               ('BACKGROUND', (0, 3), (-1, 3), HexColor('#DCFCE7'))],
    ))
    story.append(Paragraph('Table 7.3 — Total Project Cost Summary', S['Caption']))
    story.append(PageBreak())

    # ── 8. ACCEPTANCE CRITERIA AND TESTING ────────────────────────────────────
    story += sec('8', 'Acceptance Criteria and Testing')
    story.append(Paragraph(
        'Acceptance criteria follow the Given / When / Then (GWT) format for unambiguous verification. '
        'Cultural criteria were reviewed by the Kaiārahi. A full Sprint 1–4 QA checklist was '
        'executed at end of Sprint 4 — all 28 test cases returned PASS.',
        S['Body']))

    ac_extra = []
    ac_rows = [
        ['ID',    'Feature',               'Given / When / Then',                                                              'Result'],
        ['AC01',  'Registration',          'Given new user | When valid details submitted | Then account created, redirected to /login, welcome email sent', 'PASS'],
        ['AC02',  'Password strength',     'Given registration form | When password lacks uppercase or number | Then form blocked with descriptive error', 'PASS'],
        ['AC03',  'Citizen login',         'Given registered citizen | When correct credentials entered | Then JWT issued, redirected to /dashboard', 'PASS'],
        ['AC04',  'Password toggle',       'Given login page | When eye icon clicked | Then password visibility toggles correctly (show / hide)', 'PASS'],
        ['AC05',  'Private route guard',   'Given unauthenticated user | When navigates to /dashboard directly | Then immediately redirected to /login', 'PASS'],
        ['AC06',  'Issue submission',      'Given logged-in citizen | When 3-step form completed and submitted | Then ticket created, confirmation email sent', 'PASS'],
        ['AC07',  'GPS auto-fill',         'Given report step 1 | When "Use My Location" clicked | Then lat/lng filled via browser Geolocation', 'PASS'],
        ['AC08',  'AI analysis',           'Given ticket submitted | When GPT-4o completes (background) | Then AILog row has crew, escalation, summary', 'PASS'],
        ['AC09',  'Admin map',             'Given admin logged in | When map page opened | Then all tickets shown as coloured pins with detail popups', 'PASS'],
        ['AC10',  'Cross-user avatar',     'Given user A with avatar | When user B logs in on same browser | Then user B sees their own avatar only', 'PASS'],
        ['AC11',  'Email opt-out',         'Given user with email_notifications=false | When ticket status updated | Then no email sent to that user', 'PASS'],
        ['AC12',  'Cultural flag',         'Given report near Wāhi Tapu site | When Cultural Guardian runs | Then cultural_flag=True on ticket', 'PASS'],
    ]
    for i in range(1, len(ac_rows)):
        ac_extra.append(('TEXTCOLOR', (3, i), (3, i), GREEN))
        ac_extra.append(('FONTNAME',  (3, i), (3, i), 'Helvetica-Bold'))
    story.append(tbl(ac_rows, [1.2*cm, 2.5*cm, 9.5*cm, 1.8*cm], extra=ac_extra))
    story.append(Paragraph('Table 8.1 — Acceptance Criteria and Test Results', S['Caption']))

    story.append(Paragraph('Cultural Acceptance Criteria (Kaiārahi-reviewed)', S['H2']))
    for c in [
        'Te Reo Māori subtitles displayed for all major UI labels',
        'Reports near Wāhi Tapu sites automatically flagged (cultural_flag = True)',
        'Flagged tickets must not be dispatched to crews without manual admin review',
        'Anonymous submission supported — no account required for basic reporting',
        'Issue category names approved by Kaiārahi as culturally appropriate',
    ]:
        story.append(Paragraph(f'• {c}', S['BulletItem']))
    story.append(PageBreak())

    # ── 9. SYSTEM ARCHITECTURE ────────────────────────────────────────────────
    story += sec('9', 'System Architecture and Technical Documentation')
    story.append(Paragraph(
        'FixItPublic uses a five-layer architecture deployed on Azure Kubernetes Service. '
        'Frontend and backend are independently containerised for zero-downtime deployments. '
        'All client-server communication is over HTTPS with JWT-authenticated REST API calls.',
        S['Body']))

    story.append(Paragraph('Architecture Layers', S['H2']))
    layers = [
        ('PRESENTATION LAYER',    HexColor('#DBEAFE'), 'React 18 + Vite + Tailwind CSS + PWA (manifest + service worker)\nReact Router v6 — PrivateRoute guards | Google Maps JS API\nTwo auth contexts: CitizenAuthContext / AdminAuthContext'),
        ('API GATEWAY LAYER',     HexColor('#DCFCE7'), 'Django REST Framework — RESTful, versioned endpoints\nSimpleJWT authentication | AnonRateThrottle (5–10 req/hr)\nCORS headers | Custom decorators: @log_request, @cache_response, @require_council_role'),
        ('BUSINESS LOGIC LAYER',  HexColor('#FEF9C3'), 'Issue report processing and validation\nGPT-4o AI analysis (background thread via Django post_save signal)\nEmail notification service (SMTP) | Cultural Guardian module\nCrew assignment logic (CATEGORY_CREW_MAP)'),
        ('DATA ACCESS LAYER',     HexColor('#FFE4E6'), 'Django ORM + migrations | PostgreSQL (Azure Flexible Server, SSL)\nAzure Blob Storage — ticket photos and user avatars\nDjango Cache Framework — public_stats cached 300 s'),
        ('INFRASTRUCTURE LAYER',  HexColor('#F3E8FF'), 'Azure Kubernetes Service (AKS) — django-backend + react-frontend pods\nGitHub Actions CI/CD — Docker build → ACR push → AKS rolling deploy\nKubernetes Secrets | PostgreSQL sslmode=require'),
    ]
    arch_rows = [[Paragraph(f'<b>{name}</b>', S['TD']), Paragraph(detail, S['TD'])]
                 for name, _, detail in layers]
    at = Table(arch_rows, colWidths=[4.8*cm, W-4.8*cm])
    arch_cmds = [
        ('BOX',          (0,0), (-1,-1), 1.5, NAVY),
        ('INNERGRID',    (0,0), (-1,-1), 0.5, BORDER),
        ('TOPPADDING',   (0,0), (-1,-1), 8),
        ('BOTTOMPADDING',(0,0), (-1,-1), 8),
        ('LEFTPADDING',  (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('VALIGN',       (0,0), (-1,-1), 'TOP'),
    ]
    for i, (_, colour, _) in enumerate(layers):
        arch_cmds.append(('BACKGROUND', (0, i), (0, i), colour))
        arch_cmds.append(('BACKGROUND', (1, i), (1, i), white))
    at.setStyle(TableStyle(arch_cmds))
    story.append(at)
    story.append(Paragraph('Figure 9.1 — Layered Architecture Diagram', S['Caption']))

    story.append(Paragraph('Data Model Summary', S['H2']))
    story.append(tbl(
        [
            ['Class',               'Key Fields',                                                           'Relationships'],
            ['User',                'id, username, email (unique), role, phone,\navatar (ImageField), email_notifications', 'reporter_user (FK → MaintenanceTicket)\nescalated_by (FK → MaintenanceTicket)'],
            ['MaintenanceTicket',   'id, title, description, category, status,\nlat, lng, photo1–5, assigned_crew,\nescalated, escalation_level, cultural_flag', 'reporter_user → User\nescalated_by → User\none-to-one → AILog'],
            ['AILog',               'id, ticket (OneToOne), assigned_crew,\nescalated, summary, reasoning (JSON),\nconfidence (Float), model, raw_response (JSON)', 'ticket → MaintenanceTicket (CASCADE)'],
        ],
        [3*cm, 6.5*cm, W-9.5*cm],
    ))
    story.append(Paragraph('Table 9.1 — Data Model (UML Class Summary)', S['Caption']))

    story.append(Paragraph('REST API Endpoints', S['H2']))
    story.append(tbl(
        [
            ['Endpoint',                         'Method',    'Auth',    'Description'],
            ['POST /api/auth/register/',          'POST',      'Public',  'Register new citizen account'],
            ['POST /api/auth/token/',             'POST',      'Public',  'Login — returns JWT access + refresh'],
            ['GET/PUT /api/auth/profile/',        'GET / PUT', 'Citizen', 'View and update own profile'],
            ['GET /api/auth/avatar/',             'GET',       'Citizen', 'Proxy stream avatar from Azure Blob'],
            ['POST /api/auth/change-password/',   'POST',      'Citizen', 'Change password with current verification'],
            ['POST /api/requests/',               'POST',      'Public',  'Submit a new issue report'],
            ['GET /api/requests/',                'GET',       'Admin',   'List all tickets with filters'],
            ['GET /api/requests/mine/',           'GET',       'Citizen', 'List own submitted tickets'],
            ['PATCH /api/requests/<id>/status/',  'PATCH',     'Admin',   'Update ticket status'],
            ['PATCH /api/requests/<id>/assign/',  'PATCH',     'Admin',   'Assign crew to ticket'],
            ['GET /api/map/',                     'GET',       'Public',  'All geolocated tickets (map pins)'],
            ['GET /api/stats/',                   'GET',       'Public',  'Aggregated metrics — cached 5 min'],
            ['GET /api/admin/stats/',             'GET',       'Admin',   'Detailed admin statistics breakdown'],
            ['GET /api/ai-log/',                  'GET',       'Admin',   'All GPT-4o decision records'],
            ['GET /api/health/',                  'GET',       'Public',  'Database + storage health check'],
        ],
        [5.5*cm, 2.2*cm, 2*cm, W-9.7*cm],
    ))
    story.append(Paragraph('Table 9.2 — REST API Endpoints', S['Caption']))
    story.append(PageBreak())

    # ── 10. USER DOCUMENTATION ────────────────────────────────────────────────
    story += sec('10', 'User Documentation')
    story.append(Paragraph(
        'This section provides setup guidance for developers and a troubleshooting guide for operators. '
        'It directly addresses the Assessment 1 feedback that documentation lacked a troubleshooting '
        'section and FAQ guidance.',
        S['Body']))

    story.append(Paragraph('Development Setup (5 Steps)', S['H2']))
    for step, cmd, note in [
        ('1. Clone repository',       'git clone https://github.com/Nirmal-C/FixItPublic',              ''),
        ('2. Configure environment',  'cp .env.example .env',                                           'Fill in all required values from Table 10.1'),
        ('3. Start services',         'docker compose up --build',                                      'Django on :8000 | React Vite on :5173'),
        ('4. Create superuser',       'docker exec -it backend python manage.py createsuperuser',       ''),
        ('5. Open in browser',        'http://localhost:5173',                                          'Citizen portal | /admin → Django admin'),
    ]:
        story.append(Paragraph(f'<b>{step}</b>', S['H3']))
        story.append(Paragraph(f'<font face="Courier" size="9">{cmd}</font>', S['Body']))
        if note:
            story.append(Paragraph(note, S['Body']))

    story.append(Paragraph('Required Environment Variables', S['H2']))
    story.append(tbl(
        [
            ['Variable',                            'Purpose',                        'Example'],
            ['DJANGO_SECRET_KEY',                   'Django cryptographic secret',    'your-50-char-secret'],
            ['DB_NAME / DB_USER / DB_PASSWORD',     'PostgreSQL credentials',         'fixitdb / admin / pass123'],
            ['DB_HOST / DB_PORT',                   'PostgreSQL connection',          'localhost / 5432'],
            ['AZURE_STORAGE_ACCOUNT / KEY',         'Azure Blob Storage',             'account / base64key'],
            ['AZURE_CONTAINER_NAME',                'Blob container for photos',      'maintenance-photos'],
            ['OPENAI_API_KEY',                      'GPT-4o access (optional)',       'sk-...'],
            ['VITE_GOOGLE_MAPS_API_KEY',            'Google Maps JS API',             'AIza...'],
            ['EMAIL_HOST_PASSWORD',                 'SMTP authentication',            'email-password'],
            ['SUPERUSER_EMAIL / PASSWORD',          'Auto-created admin account',     'admin@council.nz / Admin1!'],
        ],
        [5.5*cm, 4.5*cm, W-10*cm],
    ))
    story.append(Paragraph('Table 10.1 — Required Environment Variables', S['Caption']))

    story.append(Paragraph('Troubleshooting Guide', S['H2']))
    story.append(tbl(
        [
            ['Problem',                                          'Likely Cause',                  'Solution'],
            ['Docker containers fail to start',                  'Missing .env or invalid creds', 'cp .env.example .env and fill all values'],
            ['"Connection refused" on API calls',               'Backend not running',            'docker compose up; verify port 8000 is exposed'],
            ['Photos not uploading',                            'Invalid Azure credentials',      'Verify AZURE_STORAGE_ACCOUNT and KEY in .env'],
            ['AI analysis not appearing in Admin',              'Missing OpenAI key',             'OPENAI_API_KEY optional — AI skipped gracefully if absent'],
            ['Map not loading',                                 'Invalid Maps API key',           'Check VITE_GOOGLE_MAPS_API_KEY; enable Maps JS API + Geocoding in Google Cloud'],
            ['Emails not sending',                              'SMTP creds or firewall',         'Verify EMAIL_HOST_PASSWORD; port 587 must be open outbound'],
            ['"Cannot use citizen portal" error on admin login','Admin trying citizen portal',    'Navigate to /admin/login for council staff accounts'],
            ['Avatar shows wrong user\'s photo',                'Browser cache',                  'Clear browser cache — fixed in commit d9cc26d with cache-control headers'],
            ['Database migration errors',                       'Stale migration state',          'python manage.py migrate --run-syncdb'],
        ],
        [4*cm, 3.5*cm, W-7.5*cm],
    ))
    story.append(Paragraph('Table 10.2 — Troubleshooting Guide', S['Caption']))
    story.append(PageBreak())

    # ── 11. CODING STANDARDS AND PYTHON DECORATORS ───────────────────────────
    story += sec('11', 'Coding Standards and Python Decorators')
    story.append(Paragraph(
        'The project follows PEP 8 (Python) and Airbnb (React/JS) style conventions. '
        'This section also details the three custom Python decorators implemented in Sprint 4.',
        S['Body']))

    story.append(Paragraph('Standards Applied', S['H2']))
    for heading, items in [
        ('Naming Conventions', [
            'Python: snake_case for functions/variables; PascalCase for classes',
            'React/JS: camelCase for functions/variables; PascalCase for components',
            'CSS: Tailwind utility classes; kebab-case for custom variables (--border, --bg-primary)',
        ]),
        ('Modularity', [
            'Backend: views.py, serializers.py, models.py, permissions.py, signals.py, decorators.py',
            'Frontend: components separated by domain (auth, dashboard, report, admin, map)',
            'API client: named export objects per domain (authApi, ticketApi, adminApi)',
        ]),
        ('Documentation', [
            'All Django views have docstrings: URL, method, auth level, behaviour',
            'Custom decorators use functools.wraps to preserve original function metadata',
            'React components include inline comments for non-obvious logic',
        ]),
    ]:
        story.append(Paragraph(heading, S['H3']))
        for item in items:
            story.append(Paragraph(f'• {item}', S['BulletItem']))

    story.append(Paragraph('Custom Python Decorators (backend/api/decorators.py)', S['H2']))
    story.append(Paragraph(
        'Three decorators follow the Single Responsibility Principle — each does exactly one thing '
        'and can be composed independently using standard Python decorator stacking.',
        S['Body']))

    for name, purpose, applied_to, code in [
        ('@log_request',
         'Logs each API request: HTTP method, path, authenticated user (or "anonymous"), '
         'HTTP status code, and execution time in milliseconds. Output goes through Django\'s '
         'logging pipeline for centralised audit trails.',
         'map_tickets, admin_stats, public_stats',
         '@log_request\n@api_view(["GET"])\ndef map_tickets(request):\n    ...'),
        ('@require_council_role',
         'Returns HTTP 403 Forbidden immediately if the caller is not an authenticated council '
         'admin or superuser. Makes the access rule explicit in the decorator stack, improving '
         'readability over the less visible @permission_classes([IsCouncilAdmin]) pattern.',
         'admin_stats',
         '@require_council_role\n@log_request\n@api_view(["GET"])\ndef admin_stats(request):\n    ...'),
        ('@cache_response(timeout)',
         'Caches the view\'s JSON response in Django\'s cache backend keyed by request path. '
         'Only HTTP 200 responses are cached. Adds X-Cache: HIT or MISS header for '
         'transparency. Applied with 300-second TTL to reduce database query load.',
         'public_stats (TTL = 300 s)',
         '@cache_response(timeout=300)\n@log_request\n@api_view(["GET"])\ndef public_stats(request):\n    ...'),
    ]:
        story.append(KeepTogether([
            Paragraph(name, S['H3']),
            Paragraph(f'<b>Purpose:</b> {purpose}', S['Body']),
            Paragraph(f'<b>Applied to:</b> {applied_to}', S['Body']),
            Paragraph(code, S['CodeBlock']),
        ]))
    story.append(PageBreak())

    # ── 12. MAINTENANCE AND SUPPORT ───────────────────────────────────────────
    story += sec('12', 'Maintenance and Support')
    story.append(Paragraph(
        'This section defines the version control strategy, bug tracking process, and maintenance plan. '
        'It directly addresses Assessment 1 feedback by providing specific maintenance examples across '
        'project cycles and detailing version control and bug tracking procedures.',
        S['Body']))

    story.append(Paragraph('Version Control Strategy', S['H2']))
    story.append(tbl(
        [
            ['Branch',     'Purpose',                                                  'Merge Strategy'],
            ['main',       'Production-ready; deployed automatically via GitHub Actions','--no-ff merge from feature branches only'],
            ['rukshan',    "Rukshan's active development branch",                       '--no-ff merge into main after review'],
            ['nirmal',     "Nirmal's active development branch",                        '--no-ff merge into main after review'],
            ['feature/*',  'Short-lived feature branches (e.g. feature/avatar-fix)',   'Merged and deleted after PR approval'],
        ],
        [2.5*cm, 7.5*cm, W-10*cm],
    ))
    story.append(Paragraph('Table 12.1 — Git Branch Strategy', S['Caption']))

    story.append(Paragraph('Semantic Versioning', S['H2']))
    story.append(tbl(
        [
            ['Version', 'Type',  'Sprint',   'Key Changes'],
            ['v1.0.0',  'Major', 'Sprint 1', 'Initial: auth, registration, basic ticket submission'],
            ['v1.1.0',  'Minor', 'Sprint 2', 'Admin dashboard, Google Maps, email notifications'],
            ['v1.2.0',  'Minor', 'Sprint 3', 'GPT-4o AI, avatar upload, profile management, CI/CD'],
            ['v2.0.0',  'Major', 'Sprint 4', 'QA verified (28/28 PASS), Python decorators, caching, audit logging'],
        ],
        [2*cm, 2*cm, 2.5*cm, W-6.5*cm],
    ))
    story.append(Paragraph('Table 12.2 — Release History and Semantic Versioning', S['Caption']))

    story.append(Paragraph('Maintenance Activities Across Project Cycles', S['H2']))
    maint_rows = [
        ['Type',        'Sprint',   'Activity',                                                     'Reference'],
        ['Corrective',  'Sprint 4', 'Fixed password toggle: key prop forces DOM re-mount of input', 'ce046be'],
        ['Corrective',  'Sprint 4', 'Fixed checkbox border invisible in light mode',                '62b2124'],
        ['Corrective',  'Sprint 4', 'Fixed cross-user avatar leak: C_PROFILE cleared on login',    'b5f8fd2'],
        ['Corrective',  'Sprint 4', 'Fixed /dashboard accessible without auth (PrivateRoute added)','b5f8fd2'],
        ['Adaptive',    'Sprint 3', 'Added Azure Blob avatar proxy to avoid SAS URL expiry',        'f6d07b1'],
        ['Adaptive',    'Sprint 2', 'Switched location search from Google Geocoder to Nominatim',   '4b43fa5'],
        ['Perfective',  'Sprint 4', '@cache_response(300) on public_stats reduces DB queries',      '4f31472'],
        ['Perfective',  'Sprint 4', '@log_request audit logging on all key API endpoints',          '4f31472'],
        ['Perfective',  'Sprint 3', 'GPT-4o runs in background thread — non-blocking response',     'signals.py'],
        ['Preventive',  'Sprint 1', 'Rate throttling: 5/hr registration, 10/hr ticket creation',   'views.py'],
        ['Preventive',  'Sprint 2', 'PostgreSQL SSL enforcement (sslmode=require)',                  'docker-compose'],
    ]
    maint_colours = {
        'Corrective': HexColor('#FEE2E2'), 'Adaptive': HexColor('#DBEAFE'),
        'Perfective': HexColor('#DCFCE7'), 'Preventive': HexColor('#FEF9C3'),
    }
    maint_extra = [('BACKGROUND', (0, i), (0, i), maint_colours.get(r[0], white))
                   for i, r in enumerate(maint_rows[1:], 1)]
    story.append(tbl(maint_rows, [2.2*cm, 1.8*cm, 8*cm, 2.5*cm], extra=maint_extra))
    story.append(Paragraph('Table 12.3 — Maintenance Activities Across Project Cycles', S['Caption']))

    story.append(Paragraph('Bug Tracking Process', S['H2']))
    for step in [
        '<b>Identify</b> — Bug found during QA or user feedback; recorded in BACKLOG.md with FAIL status',
        '<b>Prioritise</b> — Assigned Critical / High / Medium / Low based on user impact',
        '<b>Branch</b> — Short-lived fix branch created (e.g. fix/avatar-cache)',
        '<b>Fix and Verify</b> — Implement fix; re-run relevant QA test cases to confirm resolution',
        '<b>Commit</b> — Descriptive message referencing the issue (e.g. "Fix avatar shown for wrong user: disable browser caching")',
        '<b>Merge</b> — Pull Request review → --no-ff merge into main → auto-deploy via GitHub Actions',
    ]:
        story.append(Paragraph(f'• {step}', S['BulletItem']))
    story.append(PageBreak())

    # ── 13. REFLECTION REPORT ─────────────────────────────────────────────────
    story += sec('13', 'Reflection Report')
    story.append(Paragraph(
        'Individual reflections from both team members on the technical, cultural, and collaborative '
        'dimensions of the FixItPublic project (Assessment Task 8).',
        S['Body']))

    story.append(Paragraph('Nirmal Unagalle', S['H2']))
    for heading, text in [
        ('Technical Skills',
         'Working on FixItPublic significantly deepened my understanding of scalable cloud-native architecture. '
         'Deploying to Azure Kubernetes Service taught me the importance of environment isolation and Kubernetes '
         'Secrets management in production. Integrating GPT-4o through Django signals was a highlight — '
         'implementing the AI as a non-blocking background thread required careful consideration of concurrency '
         'and graceful degradation. Designing the PostgreSQL schema challenged me to balance normalisation '
         'with query performance, particularly for the AILog one-to-one relationship pattern.'),
        ('Cultural Learnings',
         'The requirement to incorporate Te Tiriti o Waitangi principles shifted my perspective on software design. '
         'Consulting a Kaiārahi made me aware that technology is never culturally neutral — our data model, '
         'API design, and language choices all carry cultural implications. Implementing the Cultural Guardian '
         'module reinforced that <i>Protection</i> in software means proactive safeguards built into the architecture, '
         'not reactive workarounds. I will carry this lens into all future professional work.'),
        ('Teamwork',
         'Collaborating with Rukshan across a shared codebase required disciplined Git practices. Early in the '
         'project we experienced merge conflicts from working on the same components; this taught us to '
         'communicate more clearly about task boundaries and agree on API contracts before parallel development. '
         'Moving to a branch-per-feature strategy in Sprint 3 significantly reduced conflicts and improved '
         'code review quality.'),
    ]:
        story.append(Paragraph(heading, S['H3']))
        story.append(Paragraph(text, S['Body']))

    story.append(Paragraph('Rukshan De Silva', S['H2']))
    for heading, text in [
        ('Technical Skills',
         'FixItPublic was my most comprehensive full-stack experience to date. Building the React frontend with '
         'two separate authentication contexts required careful state management — I learnt the importance of '
         'separating auth concerns at the context level rather than managing all state globally. The Sprint 4 QA '
         'phase was particularly valuable: working through 28 test cases revealed subtle bugs like the cross-user '
         'avatar leak caused by localStorage persistence across sessions — something organic testing would have '
         'missed. Implementing Python decorators for the MSE800 criterion gave me a deeper appreciation for '
         'meta-programming, the DRY principle, and composable design.'),
        ('Cultural Learnings',
         'Building a bilingual interface required more than adding translations — it required understanding the '
         'cultural significance of language. Using Te Reo Māori subtitles throughout the UI rather than offering '
         'it as an optional setting reflects the <i>Participation</i> principle: Māori language is always present '
         'and valued, not an opt-in feature. The Wāhi Tapu protection feature reinforced that software can actively '
         'protect cultural heritage, not merely record it. These principles will inform how I approach inclusive '
         'design in my professional career.'),
        ('Teamwork',
         'The collaboration with Nirmal was effective, though we encountered natural challenges of parallel '
         'development. The key lesson was agreeing on API interfaces early — when frontend and backend teams '
         'work in parallel, a well-defined contract in SPECIFICATIONS.md prevents integration surprises. '
         'This practice of maintaining a shared source-of-truth document is something I will carry forward '
         'to all future team projects.'),
        ('Te Tiriti o Waitangi — Shared Team Reflection',
         'As international students building technology for the New Zealand context, we felt a responsibility '
         'to engage with Māori cultural requirements genuinely rather than as a compliance checkbox. '
         'The three principles proved to be an effective framework for software ethics broadly: '
         '<b>Partnership</b> means involving all stakeholders in design decisions, not just technical ones; '
         '<b>Participation</b> means building systems accessible and usable by everyone; '
         '<b>Protection</b> means designing safeguards into the architecture from the start. '
         'We believe these principles apply to all software, not just New Zealand civic technology.'),
    ]:
        story.append(Paragraph(heading, S['H3']))
        story.append(Paragraph(text, S['Body']))
    story.append(PageBreak())

    # ── REFERENCES ─────────────────────────────────────────────────────────────
    story += sec('Appendix', 'References')
    for label, url in [
        ('GitHub Repository',           'https://github.com/Nirmal-C/FixItPublic'),
        ('Decorator Sprint Report',     'https://github.com/Nirmal-C/FixItPublic/blob/main/docs/decorator-report.md'),
        ('Django REST Framework',       'https://www.django-rest-framework.org/'),
        ('React Documentation',         'https://react.dev/'),
        ('SimpleJWT Documentation',     'https://django-rest-framework-simplejwt.readthedocs.io/'),
        ('Azure Kubernetes Service',    'https://learn.microsoft.com/en-us/azure/aks/'),
        ('OpenAI GPT-4o',               'https://platform.openai.com/docs/models/gpt-4o'),
        ('Google Maps Platform',        'https://developers.google.com/maps'),
        ('Te Tiriti o Waitangi',        'https://www.health.govt.nz/our-work/populations/maori-health/te-tiriti-o-waitangi'),
        ('PEP 8 Python Style Guide',    'https://pep8.org/'),
        ('Tailwind CSS',                'https://tailwindcss.com/docs'),
    ]:
        story.append(Paragraph(f'• <b>{label}:</b> {url}', S['BulletItem']))

    doc.build(story)
    print(f'✓  Report saved: {OUTPUT}')


if __name__ == '__main__':
    build()
