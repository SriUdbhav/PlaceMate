import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ExternalHyperlink,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
} from 'docx';
import { CVData } from '../types';

/**
 * Generates an ATS-friendly, professionally formatted Word (.docx) document
 * from the student's CVData with clickable external hyperlinks.
 */
export async function generateDocxBlob(cv: CVData): Promise<Blob> {
  const { personalDetails, summary, education, skills, projects, experience, certifications, achievements } = cv;

  const children: Paragraph[] = [];

  // Helper for section divider line
  const createSectionHeader = (title: string): Paragraph => {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 100 },
      border: {
        bottom: {
          color: '333333',
          space: 2,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 22, // 11pt
          font: 'Arial',
          color: '0F172A',
        }),
      ],
    });
  };

  // 1. Header: Candidate Full Name
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({
          text: personalDetails.fullName || 'Candidate Name',
          bold: true,
          size: 36, // 18pt
          font: 'Arial',
          color: '0F172A',
        }),
      ],
    })
  );

  // Target Role Subtitle
  if (cv.targetRole) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [
          new TextRun({
            text: cv.targetRole,
            bold: true,
            size: 22,
            font: 'Arial',
            color: '4338CA', // Indigo
          }),
        ],
      })
    );
  }

  // Contact line elements with Clickable Hyperlinks
  const contactRuns: (TextRun | ExternalHyperlink)[] = [];

  if (personalDetails.location) {
    contactRuns.push(new TextRun({ text: personalDetails.location, size: 19, font: 'Arial' }));
  }

  if (personalDetails.phone) {
    if (contactRuns.length > 0) contactRuns.push(new TextRun({ text: '  •  ', size: 19, font: 'Arial', color: '64748B' }));
    contactRuns.push(new TextRun({ text: personalDetails.phone, size: 19, font: 'Arial' }));
  }

  if (personalDetails.email) {
    if (contactRuns.length > 0) contactRuns.push(new TextRun({ text: '  •  ', size: 19, font: 'Arial', color: '64748B' }));
    contactRuns.push(
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: personalDetails.email,
            size: 19,
            font: 'Arial',
            color: '1D4ED8',
            underline: {},
          }),
        ],
        link: `mailto:${personalDetails.email}`,
      })
    );
  }

  if (personalDetails.linkedinUrl) {
    if (contactRuns.length > 0) contactRuns.push(new TextRun({ text: '  •  ', size: 19, font: 'Arial', color: '64748B' }));
    const cleanUrl = personalDetails.linkedinUrl.startsWith('http')
      ? personalDetails.linkedinUrl
      : `https://${personalDetails.linkedinUrl}`;
    contactRuns.push(
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: 'LinkedIn',
            size: 19,
            font: 'Arial',
            color: '1D4ED8',
            underline: {},
          }),
        ],
        link: cleanUrl,
      })
    );
  }

  if (personalDetails.githubUrl) {
    if (contactRuns.length > 0) contactRuns.push(new TextRun({ text: '  •  ', size: 19, font: 'Arial', color: '64748B' }));
    const cleanUrl = personalDetails.githubUrl.startsWith('http')
      ? personalDetails.githubUrl
      : `https://${personalDetails.githubUrl}`;
    contactRuns.push(
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: 'GitHub',
            size: 19,
            font: 'Arial',
            color: '1D4ED8',
            underline: {},
          }),
        ],
        link: cleanUrl,
      })
    );
  }

  if (personalDetails.portfolioUrl) {
    if (contactRuns.length > 0) contactRuns.push(new TextRun({ text: '  •  ', size: 19, font: 'Arial', color: '64748B' }));
    const cleanUrl = personalDetails.portfolioUrl.startsWith('http')
      ? personalDetails.portfolioUrl
      : `https://${personalDetails.portfolioUrl}`;
    contactRuns.push(
      new ExternalHyperlink({
        children: [
          new TextRun({
            text: 'Portfolio',
            size: 19,
            font: 'Arial',
            color: '1D4ED8',
            underline: {},
          }),
        ],
        link: cleanUrl,
      })
    );
  }

  if (contactRuns.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 180 },
        children: contactRuns,
      })
    );
  }

  // 2. Professional Summary
  if (summary) {
    children.push(createSectionHeader('Professional Summary'));
    children.push(
      new Paragraph({
        spacing: { before: 60, after: 120 },
        children: [
          new TextRun({
            text: summary,
            size: 20, // 10pt
            font: 'Arial',
            color: '1E293B',
          }),
        ],
      })
    );
  }

  // 3. Education
  if (education && education.length > 0) {
    children.push(createSectionHeader('Education'));
    education.forEach((edu) => {
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 30 },
          children: [
            new TextRun({
              text: edu.institution,
              bold: true,
              size: 20,
              font: 'Arial',
              color: '0F172A',
            }),
            new TextRun({
              text: ` (${edu.startYear} - ${edu.endYear})`,
              size: 19,
              font: 'Arial',
              color: '475569',
            }),
          ],
        })
      );
      children.push(
        new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [
            new TextRun({
              text: `${edu.degree} — ${edu.field} | `,
              size: 19,
              font: 'Arial',
              color: '334155',
            }),
            new TextRun({
              text: `Score: ${edu.cgpaOrPercentage}`,
              bold: true,
              size: 19,
              font: 'Arial',
              color: '0F172A',
            }),
          ],
        })
      );
    });
  }

  // 4. Technical Skills
  if (skills) {
    children.push(createSectionHeader('Technical Skills'));
    const skillLines = [
      { label: 'Languages', items: skills.languages },
      { label: 'Frameworks & Libraries', items: skills.frameworks },
      { label: 'Databases & Storage', items: skills.databases },
      { label: 'Developer Tools', items: skills.developerTools },
      { label: 'Core Coursework', items: skills.coursework },
    ];

    skillLines.forEach(({ label, items }) => {
      if (items && items.length > 0) {
        children.push(
          new Paragraph({
            spacing: { before: 30, after: 40 },
            children: [
              new TextRun({
                text: `${label}: `,
                bold: true,
                size: 20,
                font: 'Arial',
                color: '0F172A',
              }),
              new TextRun({
                text: items.join(', '),
                size: 20,
                font: 'Arial',
                color: '1E293B',
              }),
            ],
          })
        );
      }
    });
  }

  // 5. Key Projects
  if (projects && projects.length > 0) {
    children.push(createSectionHeader('Key Projects'));
    projects.forEach((proj) => {
      const headerRuns: (TextRun | ExternalHyperlink)[] = [
        new TextRun({
          text: proj.title,
          bold: true,
          size: 20,
          font: 'Arial',
          color: '0F172A',
        }),
      ];
      if (proj.techStack) {
        headerRuns.push(
          new TextRun({
            text: ` | Tech Stack: ${proj.techStack}`,
            italics: true,
            size: 19,
            font: 'Arial',
            color: '4338CA',
          })
        );
      }
      if (proj.link) {
        headerRuns.push(new TextRun({ text: '  [', size: 18, font: 'Arial' }));
        headerRuns.push(
          new ExternalHyperlink({
            children: [
              new TextRun({
                text: 'Project Link',
                size: 18,
                font: 'Arial',
                color: '1D4ED8',
                underline: {},
              }),
            ],
            link: proj.link.startsWith('http') ? proj.link : `https://${proj.link}`,
          })
        );
        headerRuns.push(new TextRun({ text: ']', size: 18, font: 'Arial' }));
      }

      children.push(
        new Paragraph({
          spacing: { before: 80, after: 30 },
          children: headerRuns,
        })
      );

      if (proj.bullets && proj.bullets.length > 0) {
        proj.bullets.forEach((b) => {
          const cleanText = b.replace(/^[•\-\*]\s*/, '').trim();
          if (cleanText) {
            children.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { before: 20, after: 30 },
                children: [
                  new TextRun({
                    text: cleanText,
                    size: 19,
                    font: 'Arial',
                    color: '1E293B',
                  }),
                ],
              })
            );
          }
        });
      }
    });
  }

  // 6. Experience & Internships
  if (experience && experience.length > 0) {
    children.push(createSectionHeader('Internships & Experience'));
    experience.forEach((exp) => {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 30 },
          children: [
            new TextRun({
              text: exp.role,
              bold: true,
              size: 20,
              font: 'Arial',
              color: '0F172A',
            }),
            new TextRun({
              text: ` — ${exp.company}`,
              size: 20,
              font: 'Arial',
              color: '334155',
            }),
            new TextRun({
              text: ` (${exp.duration})`,
              size: 19,
              font: 'Arial',
              color: '64748B',
            }),
          ],
        })
      );

      if (exp.bullets && exp.bullets.length > 0) {
        exp.bullets.forEach((b) => {
          const cleanText = b.replace(/^[•\-\*]\s*/, '').trim();
          if (cleanText) {
            children.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { before: 20, after: 30 },
                children: [
                  new TextRun({
                    text: cleanText,
                    size: 19,
                    font: 'Arial',
                    color: '1E293B',
                  }),
                ],
              })
            );
          }
        });
      }
    });
  }

  // 7. Certifications & Honors
  if ((certifications && certifications.length > 0) || (achievements && achievements.length > 0)) {
    children.push(createSectionHeader('Certifications & Honors'));

    if (certifications) {
      certifications.forEach((c) => {
        const certRuns: (TextRun | ExternalHyperlink)[] = [
          new TextRun({
            text: `${c.name} — ${c.issuer} (${c.issueDate})`,
            size: 19,
            font: 'Arial',
            color: '1E293B',
          }),
        ];
        if (c.credentialUrl) {
          certRuns.push(new TextRun({ text: '  [', size: 18, font: 'Arial' }));
          certRuns.push(
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: 'Verify Credential',
                  size: 18,
                  font: 'Arial',
                  color: '1D4ED8',
                  underline: {},
                }),
              ],
              link: c.credentialUrl.startsWith('http') ? c.credentialUrl : `https://${c.credentialUrl}`,
            })
          );
          certRuns.push(new TextRun({ text: ']', size: 18, font: 'Arial' }));
        }

        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 20, after: 30 },
            children: certRuns,
          })
        );
      });
    }

    if (achievements) {
      achievements.forEach((a) => {
        const cleanText = a.replace(/^[•\-\*]\s*/, '').trim();
        if (cleanText) {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { before: 20, after: 30 },
              children: [
                new TextRun({
                  text: cleanText,
                  size: 19,
                  font: 'Arial',
                  color: '1E293B',
                }),
              ],
            })
          );
        }
      });
    }
  }

  // Create document with standard A4 margins (0.6 inch / 864 twips)
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.6),
              right: convertInchesToTwip(0.6),
              bottom: convertInchesToTwip(0.6),
              left: convertInchesToTwip(0.6),
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
