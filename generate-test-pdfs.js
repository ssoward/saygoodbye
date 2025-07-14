const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ensure test-docs directory exists
const testDocsDir = path.join(__dirname, 'test-docs');
if (!fs.existsSync(testDocsDir)) {
  fs.mkdirSync(testDocsDir, { recursive: true });
}

// Valid test documents (13)
const validDocs = [
  {
    id: 'V1',
    title: 'Valid durable POA with notary and 2 witnesses',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, John Smith, residing at 123 Main Street, Los Angeles, CA 90210, hereby appoint my daughter, Jane Smith, as my attorney-in-fact (agent) to act for me and in my name.',
      agent: 'Agent: Jane Smith, 456 Oak Avenue, Beverly Hills, CA 90212',
      cremationAuthority: 'I hereby grant my agent the specific authority to authorize my cremation and disposition of my remains according to their best judgment. This authority includes all necessary decisions regarding cremation services, memorial arrangements, and final disposition of ashes.',
      durability: 'This Power of Attorney shall remain effective even if I become incapacitated or disabled.',
      notary: {
        name: 'Robert Johnson',
        commission: '123456',
        county: 'Los Angeles',
        expires: '2026-12-31',
        date: '2025-01-15'
      },
      witnesses: [
        { name: 'Michael Brown', address: '789 Pine Street, Los Angeles, CA 90210', date: '2025-01-15' },
        { name: 'Sarah Wilson', address: '321 Elm Street, Los Angeles, CA 90211', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'V2',
    title: 'Valid non-durable POA with notary and 1 witness',
    content: {
      type: 'Power of Attorney',
      principal: 'I, Mary Johnson, residing at 789 First Street, San Francisco, CA 94102, hereby appoint my son, David Johnson, as my attorney-in-fact.',
      agent: 'Agent: David Johnson, 111 Second Street, Oakland, CA 94601',
      cremationAuthority: 'My agent is specifically authorized to make all decisions regarding cremation of my remains, including selection of crematory services and disposition of ashes.',
      notary: {
        name: 'Lisa Chen',
        commission: '789012',
        county: 'San Francisco',
        expires: '2027-06-30',
        date: '2025-01-15'
      },
      witnesses: [
        { name: 'Thomas Anderson', address: '555 Market Street, San Francisco, CA 94102', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'V3',
    title: 'Valid POA with minimal verbiage',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Robert Davis, appoint Susan Davis as my agent.',
      agent: 'Agent: Susan Davis',
      cremationAuthority: 'Agent may authorize cremation.',
      durability: 'This POA is durable.',
      notary: {
        name: 'Mark Thompson',
        commission: '345678',
        county: 'Orange',
        expires: '2026-03-15',
        date: '2025-01-15'
      },
      witnesses: [
        { name: 'Jennifer Lee', address: 'Irvine, CA', date: '2025-01-15' },
        { name: 'Kevin Park', address: 'Newport Beach, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'V4',
    title: 'Valid POA with complex verbiage',
    content: {
      type: 'Durable Power of Attorney for Healthcare and Final Disposition',
      principal: 'I, Elizabeth Martinez, of sound mind and legal age, residing at 2468 Sunset Boulevard, Los Angeles, California 90028, do hereby revoke all prior powers of attorney and appoint my beloved husband, Carlos Martinez, residing at the same address, as my true and lawful attorney-in-fact and agent.',
      agent: 'Primary Agent: Carlos Martinez, 2468 Sunset Boulevard, Los Angeles, CA 90028\nAlternate Agent: Maria Rodriguez, 1357 Vine Street, Hollywood, CA 90028',
      cremationAuthority: 'I specifically and expressly grant to my agent the full power and authority to make all decisions regarding the disposition of my mortal remains, including but not limited to: (a) authorization for cremation or other lawful disposition; (b) selection of funeral home, crematory, or other service providers; (c) determination of memorial services, ceremonies, or celebrations of life; (d) disposition of cremated remains including burial, scattering, or retention; (e) selection of urns, containers, or other vessels; and (f) all other decisions related to my final arrangements as my agent deems appropriate and in accordance with my wishes as may have been expressed to my agent.',
      durability: 'This Power of Attorney shall not be affected by my subsequent disability or incapacity and shall remain in full force and effect until my death, unless I revoke it in writing while I am of sound mind.',
      notary: {
        name: 'Patricia Williams',
        commission: '456789',
        county: 'Los Angeles',
        expires: '2025-11-30',
        date: '2025-01-15'
      },
      witnesses: [
        { name: 'Dr. James Rodriguez', address: '3690 Medical Center Drive, Los Angeles, CA 90028', date: '2025-01-15' },
        { name: 'Attorney Sarah Kim', address: '1000 Wilshire Blvd, Suite 500, Los Angeles, CA 90017', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'V5',
    title: 'Valid POA with manual notary input',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, William Garcia, hereby appoint my nephew, Michael Garcia, as my agent.',
      agent: 'Agent: Michael Garcia, 159 Broadway, San Diego, CA 92101',
      cremationAuthority: 'My agent has full authority to authorize cremation and make all related decisions.',
      durability: 'This power remains effective during incapacity.',
      notary: {
        name: 'Diana Foster',
        commission: '567890',
        county: 'San Diego',
        expires: '2026-09-15',
        date: '2025-01-15',
        note: '(Manual notary verification required - commission not in digital database)'
      },
      witnesses: [
        { name: 'Angela Rodriguez', address: 'San Diego, CA', date: '2025-01-15' },
        { name: 'Christopher Lee', address: 'San Diego, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'V6',
    title: 'Valid POA with e-signature',
    content: {
      type: 'Durable Power of Attorney (Electronic)',
      principal: 'I, Amanda Thompson, electronically execute this document appointing my sister, Rachel Thompson, as my agent.',
      agent: 'Agent: Rachel Thompson (electronic signature verified)',
      cremationAuthority: 'Agent authorized for all cremation decisions and arrangements.',
      durability: 'Durable during incapacity.',
      notary: {
        name: 'E-Notary: Jennifer Walsh',
        commission: '678901',
        county: 'Sacramento',
        expires: '2027-01-31',
        date: '2025-01-15',
        note: '(Electronic notarization - DocuSign verified)'
      },
      witnesses: [
        { name: 'Electronic Witness 1: Tom Baker', address: 'Sacramento, CA', date: '2025-01-15', note: '(E-signature verified)' },
        { name: 'Electronic Witness 2: Linda Green', address: 'Sacramento, CA', date: '2025-01-15', note: '(E-signature verified)' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'V7',
    title: 'Valid POA with single witness',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Charles Wilson, appoint my wife, Helen Wilson, as my agent for final arrangements.',
      agent: 'Agent: Helen Wilson, 753 Cedar Lane, Fresno, CA 93720',
      cremationAuthority: 'Helen is authorized to arrange for my cremation and handle all related matters.',
      durability: 'This POA remains valid if I become incapacitated.',
      notary: {
        name: 'Frank Miller',
        commission: '789123',
        county: 'Fresno',
        expires: '2026-05-20',
        date: '2025-01-15'
      },
      witnesses: [
        { name: 'Dorothy Adams', address: '951 Maple Drive, Fresno, CA 93721', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'V8',
    title: 'Valid POA with recent notary',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Jessica Brown, appoint my brother, Daniel Brown, as my agent.',
      agent: 'Agent: Daniel Brown, 852 Valley Road, Bakersfield, CA 93301',
      cremationAuthority: 'Daniel may authorize cremation and all final disposition arrangements.',
      durability: 'Effective during any incapacity.',
      notary: {
        name: 'Recently Commissioned: Alex Rivera',
        commission: '890234',
        county: 'Kern',
        expires: '2029-12-31',
        date: '2025-01-15',
        note: '(Commission effective 2025-01-01)'
      },
      witnesses: [
        { name: 'Maria Santos', address: 'Bakersfield, CA', date: '2025-01-15' },
        { name: 'Robert Clark', address: 'Bakersfield, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'V9',
    title: 'Valid POA with multiple agents',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Henry Lopez, appoint multiple agents to act jointly for my final arrangements.',
      agent: 'Primary Agent: Sofia Lopez, 147 Mountain View, San Jose, CA 95101\nSecondary Agent: Carlos Lopez, 369 Oak Street, San Jose, CA 95102\nTertiary Agent: Isabella Martinez, 258 Pine Avenue, Santa Clara, CA 95050',
      cremationAuthority: 'Any of my appointed agents may independently authorize cremation and make all related decisions for final disposition of my remains.',
      durability: 'This power survives incapacity and disability.',
      notary: {
        name: 'Grace Kim',
        commission: '901345',
        county: 'Santa Clara',
        expires: '2026-08-15',
        date: '2025-01-15'
      },
      witnesses: [
        { name: 'Dr. Andrew Chen', address: 'San Jose, CA', date: '2025-01-15' },
        { name: 'Lisa Patel', address: 'Santa Clara, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'V10',
    title: 'Valid POA with scanned signature',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Margaret Taylor, appoint my daughter, Emily Taylor, as my agent.',
      agent: 'Agent: Emily Taylor, 741 Beach Drive, Santa Barbara, CA 93101',
      cremationAuthority: 'Emily has full authority for cremation authorization and arrangements.',
      durability: 'Remains effective during incapacity.',
      notary: {
        name: 'Steven White (Scanned Signature)',
        commission: '012456',
        county: 'Santa Barbara',
        expires: '2026-04-30',
        date: '2025-01-15',
        note: '(Original signature scanned - verified authentic)'
      },
      witnesses: [
        { name: 'Nancy Phillips', address: 'Santa Barbara, CA', date: '2025-01-15' },
        { name: 'George Martinez', address: 'Santa Barbara, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'V11',
    title: 'Valid POA with minimal notary details',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Paul Anderson, appoint my son, Mark Anderson, as my agent.',
      agent: 'Agent: Mark Anderson',
      cremationAuthority: 'Mark may authorize cremation.',
      durability: 'Durable.',
      notary: {
        name: 'Susan Davis',
        commission: '123789',
        date: '2025-01-15'
      },
      witnesses: [
        { name: 'Karen Johnson', date: '2025-01-15' },
        { name: 'Richard Smith', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'V12',
    title: 'Valid POA with non-standard format',
    content: {
      type: 'POWER OF ATTORNEY - CREMATION AUTHORITY',
      principal: 'PRINCIPAL: Dorothy Martinez\nADDRESS: 963 Coastal Highway, Monterey, CA 93940',
      agent: 'APPOINTED AGENT: Anthony Martinez\nAGENT ADDRESS: Same as above',
      cremationAuthority: '*** CREMATION AUTHORIZATION ***\nThe agent named above is hereby granted specific and explicit authority to authorize cremation of my remains and make all decisions regarding final disposition, memorial services, and related arrangements.',
      durability: '>>> DURABILITY CLAUSE <<<\nThis power shall continue in effect notwithstanding my incapacity.',
      notary: {
        name: 'Michelle Rodriguez',
        commission: '234890',
        county: 'Monterey',
        expires: '2027-02-28',
        date: '2025-01-15'
      },
      witnesses: [
        { name: 'WITNESS #1: Rebecca Foster', address: 'Monterey, CA', date: '2025-01-15' },
        { name: 'WITNESS #2: Jonathan Lee', address: 'Carmel, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'V13',
    title: 'Valid POA with typed signatures',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Catherine Wilson, appoint my niece, Ashley Wilson, as my agent.',
      agent: 'Agent: Ashley Wilson, 487 Garden Street, Pasadena, CA 91101',
      cremationAuthority: 'Ashley is authorized to make all cremation decisions.',
      durability: 'This POA is durable.',
      notary: {
        name: '/s/ Brian Thompson (Typed Signature)',
        commission: '345901',
        county: 'Los Angeles',
        expires: '2026-07-15',
        date: '2025-01-15',
        note: '(Typed signature - original on file)'
      },
      witnesses: [
        { name: '/s/ Mary Johnson (Typed)', address: 'Pasadena, CA', date: '2025-01-15' },
        { name: '/s/ David Kim (Typed)', address: 'Pasadena, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  }
];

// Invalid test documents (12)
const invalidDocs = [
  {
    id: 'I1',
    title: 'Invalid notary (expired)',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Richard Brown, appoint my wife, Linda Brown, as my agent.',
      agent: 'Agent: Linda Brown, 123 Expired Street, Los Angeles, CA 90210',
      cremationAuthority: 'Linda may authorize cremation and all related arrangements.',
      durability: 'This POA remains effective during incapacity.',
      notary: {
        name: 'EXPIRED NOTARY: Harold Wilson',
        commission: '999999',
        county: 'Los Angeles',
        expires: '2023-12-31',
        date: '2025-01-15',
        note: '*** COMMISSION EXPIRED ***'
      },
      witnesses: [
        { name: 'Alice Green', address: 'Los Angeles, CA', date: '2025-01-15' },
        { name: 'Bob Martinez', address: 'Los Angeles, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'I2',
    title: 'Missing notary',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Sandra Lee, appoint my brother, Kevin Lee, as my agent.',
      agent: 'Agent: Kevin Lee, 456 No Notary Lane, San Francisco, CA 94102',
      cremationAuthority: 'Kevin has authority to authorize cremation and make all final arrangements.',
      durability: 'This POA is durable and survives incapacity.',
      notary: null, // No notary section
      witnesses: [
        { name: 'Carol Davis', address: 'San Francisco, CA', date: '2025-01-15' },
        { name: 'Frank Wilson', address: 'San Francisco, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'I3',
    title: 'Notary is agent',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Michael Smith, appoint my son, Robert Smith, as my agent.',
      agent: 'Agent: Robert Smith, 789 Conflict Street, San Diego, CA 92101',
      cremationAuthority: 'Robert is authorized for all cremation decisions.',
      durability: 'Remains effective during incapacity.',
      notary: {
        name: 'CONFLICT: Robert Smith (SAME AS AGENT)',
        commission: '111111',
        county: 'San Diego',
        expires: '2026-06-30',
        date: '2025-01-15',
        note: '*** NOTARY CANNOT BE AGENT - INVALID ***'
      },
      witnesses: [
        { name: 'Diana Foster', address: 'San Diego, CA', date: '2025-01-15' },
        { name: 'Mark Johnson', address: 'San Diego, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'I4',
    title: 'No witness signatures',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Jennifer Davis, appoint my daughter, Sarah Davis, as my agent.',
      agent: 'Agent: Sarah Davis, 321 No Witness Way, Sacramento, CA 95814',
      cremationAuthority: 'Sarah may authorize cremation and handle all arrangements.',
      durability: 'This POA survives incapacity.',
      notary: {
        name: 'Laura Chen',
        commission: '222222',
        county: 'Sacramento',
        expires: '2026-12-15',
        date: '2025-01-15'
      },
      witnesses: [], // No witnesses
      signed: '2025-01-15'
    }
  },
  {
    id: 'I5',
    title: 'Witness is agent',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Thomas Wilson, appoint my nephew, James Wilson, as my agent.',
      agent: 'Agent: James Wilson, 654 Witness Problem Ave, Fresno, CA 93720',
      cremationAuthority: 'James has full cremation authority.',
      durability: 'Durable during incapacity.',
      notary: {
        name: 'Patricia Adams',
        commission: '333333',
        county: 'Fresno',
        expires: '2026-09-30',
        date: '2025-01-15'
      },
      witnesses: [
        { name: 'CONFLICT: James Wilson (SAME AS AGENT)', address: 'Fresno, CA', date: '2025-01-15', note: '*** WITNESS CANNOT BE AGENT ***' },
        { name: 'Mary Thompson', address: 'Fresno, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'I6',
    title: 'Missing cremation verbiage',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Barbara Martinez, appoint my son, Carlos Martinez, as my agent for general purposes.',
      agent: 'Agent: Carlos Martinez, 987 General Powers Blvd, Bakersfield, CA 93301',
      cremationAuthority: 'Carlos may handle my general affairs and make healthcare decisions.', // No cremation authority
      durability: 'This POA remains effective during incapacity.',
      notary: {
        name: 'David Rodriguez',
        commission: '444444',
        county: 'Kern',
        expires: '2026-11-30',
        date: '2025-01-15'
      },
      witnesses: [
        { name: 'Elena Garcia', address: 'Bakersfield, CA', date: '2025-01-15' },
        { name: 'Antonio Lopez', address: 'Bakersfield, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'I7',
    title: 'Unreadable PDF (corrupt)',
    content: {
      type: 'CORRUPT_PDF',
      principal: 'CORRUPT_TEXT_UNREADABLE',
      agent: 'CORRUPT_AGENT_DATA',
      cremationAuthority: 'CORRUPT_CREMATION_TEXT',
      corrupted: true
    }
  },
  {
    id: 'I8',
    title: 'Invalid notary commission #',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Angela Thompson, appoint my sister, Michelle Thompson, as my agent.',
      agent: 'Agent: Michelle Thompson, 147 Invalid Commission Dr, San Jose, CA 95101',
      cremationAuthority: 'Michelle may authorize cremation and all related decisions.',
      durability: 'This POA is durable.',
      notary: {
        name: 'INVALID COMMISSION: Gary Foster',
        commission: 'INVALID123',
        county: 'Santa Clara',
        expires: '2026-05-15',
        date: '2025-01-15',
        note: '*** INVALID COMMISSION NUMBER FORMAT ***'
      },
      witnesses: [
        { name: 'Victoria Lee', address: 'San Jose, CA', date: '2025-01-15' },
        { name: 'Benjamin Park', address: 'San Jose, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'I9',
    title: 'Expired POA (past end date)',
    content: {
      type: 'Non-Durable Power of Attorney',
      principal: 'I, Christopher Garcia, appoint my wife, Maria Garcia, as my agent.',
      agent: 'Agent: Maria Garcia, 258 Expired POA Street, Santa Barbara, CA 93101',
      cremationAuthority: 'Maria may authorize cremation during the term of this POA.',
      expiration: 'THIS POA EXPIRES ON DECEMBER 31, 2024 *** EXPIRED ***',
      notary: {
        name: 'Rachel Adams',
        commission: '555555',
        county: 'Santa Barbara',
        expires: '2026-03-31',
        date: '2023-12-15'
      },
      witnesses: [
        { name: 'Samuel Brown', address: 'Santa Barbara, CA', date: '2023-12-15' },
        { name: 'Lisa Rodriguez', address: 'Santa Barbara, CA', date: '2023-12-15' }
      ],
      signed: '2023-12-15'
    }
  },
  {
    id: 'I10',
    title: 'Incomplete notary details',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Nancy Wilson, appoint my brother, Peter Wilson, as my agent.',
      agent: 'Agent: Peter Wilson, 369 Incomplete Info Lane, Monterey, CA 93940',
      cremationAuthority: 'Peter has authority for cremation decisions.',
      durability: 'This POA survives incapacity.',
      notary: {
        name: 'INCOMPLETE: John Doe',
        commission: '', // Missing commission number
        county: 'Monterey',
        expires: '',
        date: '2025-01-15',
        note: '*** MISSING COMMISSION NUMBER AND EXPIRATION ***'
      },
      witnesses: [
        { name: 'Helen Foster', address: 'Monterey, CA', date: '2025-01-15' },
        { name: 'Edward Martinez', address: 'Carmel, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'I11',
    title: 'Non-compliant verbiage',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Karen Lee, appoint my cousin, Steven Lee, as my agent.',
      agent: 'Agent: Steven Lee, 741 Vague Language Rd, Pasadena, CA 91101',
      cremationAuthority: 'Steven may handle my final arrangements as he sees fit.', // Too vague
      durability: 'This POA remains in effect.',
      notary: {
        name: 'Amanda Clark',
        commission: '666666',
        county: 'Los Angeles',
        expires: '2026-08-31',
        date: '2025-01-15'
      },
      witnesses: [
        { name: 'Timothy Johnson', address: 'Pasadena, CA', date: '2025-01-15' },
        { name: 'Patricia Kim', address: 'Pasadena, CA', date: '2025-01-15' }
      ],
      signed: '2025-01-15'
    }
  },
  {
    id: 'I12',
    title: 'Scanned but illegible signatures',
    content: {
      type: 'Durable Power of Attorney',
      principal: 'I, Donald Brown, appoint my wife, Helen Brown, as my agent.',
      agent: 'Agent: Helen Brown, 852 Illegible Signature Way, Long Beach, CA 90802',
      cremationAuthority: 'Helen may authorize cremation and make all related decisions.',
      durability: 'This POA is durable.',
      notary: {
        name: '~~~illegible signature~~~',
        commission: '777777',
        county: 'Los Angeles',
        expires: '2026-10-31',
        date: '2025-01-15',
        note: '*** SIGNATURE TOO ILLEGIBLE TO VERIFY ***'
      },
      witnesses: [
        { name: '~~~illegible~~~', address: 'Long Beach, CA', date: '2025-01-15', note: '*** ILLEGIBLE SIGNATURE ***' },
        { name: '~~~cannot read~~~', address: 'Long Beach, CA', date: '2025-01-15', note: '*** ILLEGIBLE SIGNATURE ***' }
      ],
      signed: '2025-01-15'
    }
  }
];

// Function to generate a PDF document
function generatePDF(doc, isValid) {
  const pdfDoc = new PDFDocument({ margin: 72 });
  const filename = `${doc.id}.pdf`;
  const filepath = path.join(testDocsDir, filename);
  
  pdfDoc.pipe(fs.createWriteStream(filepath));
  
  // Handle corrupt PDF case
  if (doc.content.corrupted) {
    // Create a corrupted PDF by writing invalid content
    const corruptContent = Buffer.from([
      0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // %PDF-1.4
      0x0A, 0xFF, 0xFF, 0xFF, 0xFF, // Invalid bytes
      0x43, 0x4F, 0x52, 0x52, 0x55, 0x50, 0x54, // CORRUPT
      0xFF, 0xFE, 0xFD, 0xFC, 0xFB, 0xFA, 0xF9, // More invalid bytes
      0x25, 0x25, 0x45, 0x4F, 0x46 // %%EOF
    ]);
    fs.writeFileSync(filepath, corruptContent);
    console.log(`Generated: ${filename} (Invalid - Corrupt)`);
    return;
  }
  
  // Header
  pdfDoc.fontSize(18).font('Helvetica-Bold').text('POWER OF ATTORNEY', { align: 'center' });
  pdfDoc.moveDown();
  pdfDoc.fontSize(14).font('Helvetica').text('State of California', { align: 'center' });
  pdfDoc.moveDown(2);
  
  // Document type
  pdfDoc.fontSize(12).font('Helvetica-Bold').text(doc.content.type);
  pdfDoc.moveDown();
  
  // Principal section
  pdfDoc.font('Helvetica').text(doc.content.principal);
  pdfDoc.moveDown();
  
  // Agent section
  pdfDoc.text(doc.content.agent);
  pdfDoc.moveDown();
  
  // Cremation authority
  pdfDoc.font('Helvetica-Bold').text('CREMATION AUTHORITY:');
  pdfDoc.font('Helvetica').text(doc.content.cremationAuthority);
  pdfDoc.moveDown();
  
  // Durability clause (if present)
  if (doc.content.durability) {
    pdfDoc.font('Helvetica-Bold').text('DURABILITY:');
    pdfDoc.font('Helvetica').text(doc.content.durability);
    pdfDoc.moveDown();
  }
  
  // Expiration (for invalid docs)
  if (doc.content.expiration) {
    pdfDoc.font('Helvetica-Bold').text('EXPIRATION:');
    pdfDoc.font('Helvetica').text(doc.content.expiration);
    pdfDoc.moveDown();
  }
  
  // Principal signature
  pdfDoc.moveDown();
  pdfDoc.text(`Principal Signature: _________________________    Date: ${doc.content.signed}`);
  pdfDoc.moveDown(2);
  
  // Notary section
  if (doc.content.notary) {
    pdfDoc.font('Helvetica-Bold').text('NOTARY ACKNOWLEDGMENT');
    pdfDoc.font('Helvetica');
    pdfDoc.text(`Notary: ${doc.content.notary.name}`);
    if (doc.content.notary.commission) {
      pdfDoc.text(`Commission #: ${doc.content.notary.commission}`);
    }
    if (doc.content.notary.county) {
      pdfDoc.text(`County: ${doc.content.notary.county}`);
    }
    if (doc.content.notary.expires) {
      pdfDoc.text(`Commission Expires: ${doc.content.notary.expires}`);
    }
    pdfDoc.text(`Date Notarized: ${doc.content.notary.date}`);
    if (doc.content.notary.note) {
      pdfDoc.font('Helvetica-Oblique').text(doc.content.notary.note);
    }
    pdfDoc.moveDown();
    pdfDoc.text('Notary Signature: _________________________');
    pdfDoc.moveDown(2);
  } else {
    pdfDoc.font('Helvetica-Bold').text('*** NO NOTARY ACKNOWLEDGMENT ***');
    pdfDoc.moveDown(2);
  }
  
  // Witnesses section
  if (doc.content.witnesses && doc.content.witnesses.length > 0) {
    pdfDoc.font('Helvetica-Bold').text('WITNESS SIGNATURES');
    pdfDoc.font('Helvetica');
    doc.content.witnesses.forEach((witness, index) => {
      pdfDoc.text(`Witness ${index + 1}: ${witness.name}`);
      if (witness.address) {
        pdfDoc.text(`Address: ${witness.address}`);
      }
      pdfDoc.text(`Date: ${witness.date}`);
      if (witness.note) {
        pdfDoc.font('Helvetica-Oblique').text(witness.note);
        pdfDoc.font('Helvetica');
      }
      pdfDoc.text('Signature: _________________________');
      pdfDoc.moveDown();
    });
  } else {
    pdfDoc.font('Helvetica-Bold').text('*** NO WITNESS SIGNATURES ***');
  }
  
  // Footer
  pdfDoc.moveDown(2);
  pdfDoc.fontSize(10).font('Helvetica-Oblique');
  pdfDoc.text(`Test Document ${doc.id}: ${doc.title}`, { align: 'center' });
  pdfDoc.text(`Generated for Say Goodbye POA App Testing - ${isValid ? 'VALID' : 'INVALID'} Document`, { align: 'center' });
  
  pdfDoc.end();
  console.log(`Generated: ${filename} (${isValid ? 'Valid' : 'Invalid'})`);
}

// Generate all test documents
console.log('Generating POA test documents...');
console.log(`Output directory: ${testDocsDir}`);

// Generate valid documents
console.log('\nGenerating valid documents:');
validDocs.forEach(doc => generatePDF(doc, true));

// Generate invalid documents
console.log('\nGenerating invalid documents:');
invalidDocs.forEach(doc => generatePDF(doc, false));

console.log('\nTest document generation complete!');
console.log(`Total documents generated: ${validDocs.length + invalidDocs.length}`);
console.log(`Valid documents: ${validDocs.length}`);
console.log(`Invalid documents: ${invalidDocs.length}`);
