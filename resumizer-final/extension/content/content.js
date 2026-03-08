// Resumizer content script — extracts job description from page

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'extractJD') {
    sendResponse({
      jd: extractJD(),
      title: extractTitle(),
      company: extractCompany(),
      site: detectSite(),
      url: window.location.href
    });
  }
  return true;
});

function extractJD() {
  const selectors = [
    // LinkedIn
    '.jobs-description__content',
    '.jobs-box__html-content',
    '.job-view-layout',
    // Indeed
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    '[data-testid="jobsearch-JobComponent-description"]',
    // Glassdoor
    '[data-test="jobDescriptionContent"]',
    '.jobDescriptionContent',
    // Greenhouse
    '#content .section-wrapper',
    '.job-post__description',
    // Lever
    '.posting-description',
    '.section-wrapper',
    // Workday
    '[data-automation-id="jobPostingDescription"]',
    // Ashby
    '.ashby-job-posting-description',
    // Generic
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[id*="job-description"]',
    '[id*="jobDescription"]',
    'article[class*="job"]',
    'main'
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const text = el.innerText.trim();
      if (text.length > 150) return text;
    }
  }
  return document.body.innerText.substring(0, 6000).trim();
}

function extractTitle() {
  const selectors = [
    'h1.job-title', 'h1[class*="title"]', 'h1',
    '[data-test="job-title"]',
    '[class*="jobTitle"]',
    '[data-automation-id="jobPostingHeader"]',
    '.posting-headline h2'
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim().length > 1) return el.innerText.trim().substring(0, 100);
  }
  return document.title.split('|')[0].split('-')[0].trim() || 'Job Position';
}

function extractCompany() {
  const selectors = [
    '[data-test="employer-name"]',
    '.jobs-unified-top-card__company-name',
    '[class*="companyName"]',
    '[class*="company-name"]',
    '.employer-name'
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim().length > 1) return el.innerText.trim().substring(0, 60);
  }
  return '';
}

function detectSite() {
  const h = window.location.hostname;
  if (h.includes('linkedin')) return 'LinkedIn';
  if (h.includes('indeed')) return 'Indeed';
  if (h.includes('glassdoor')) return 'Glassdoor';
  if (h.includes('lever.co')) return 'Lever';
  if (h.includes('greenhouse')) return 'Greenhouse';
  if (h.includes('workday')) return 'Workday';
  if (h.includes('ashby')) return 'Ashby';
  if (h.includes('wellfound') || h.includes('angel.co')) return 'Wellfound';
  if (h.includes('simplyhired')) return 'SimplyHired';
  if (h.includes('ziprecruiter')) return 'ZipRecruiter';
  return null;
}
