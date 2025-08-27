export const data = {
    users: [
        {id: 1, username: "storyteller_jane", email: "jane@example.com", joinDate: "2024-01-15", storiesCreated: 3, contributions: 12},
        {id: 2, username: "creative_alex", email: "alex@example.com", joinDate: "2024-02-10", storiesCreated: 1, contributions: 8},
        {id: 3, username: "narrative_sam", email: "sam@example.com", joinDate: "2024-03-05", storiesCreated: 2, contributions: 15}
    ],
    stories: [
        {
            id: 1,
            title: "The Last Library",
            genre: "Science Fiction",
            description: "In a post-apocalyptic world, a mysterious library holds the key to humanity's future.",
            createdBy: 1,
            createdDate: "2024-06-01",
            accessLevel: "anyone",
            requireExamples: false,
            blockedUsers: [],
            approvedContributors: [],
            paragraphs: [
                {id: 1, author: "storyteller_jane", content: "The dust settled on the cracked pavement as Maya approached the imposing structure. After months of wandering through the wasteland, she had finally found it—the Last Library. Its towering spires pierced the grey sky like fingers reaching for hope itself.", timestamp: "2024-06-01T10:00:00Z"},
                {id: 2, author: "creative_alex", content: "The massive doors stood slightly ajar, revealing a warm golden glow from within. Maya hesitated for a moment, her hand trembling as she reached for the ancient brass handle. She had heard whispers of this place in the settlements—some called it salvation, others called it a trap.", timestamp: "2024-06-01T14:30:00Z"},
                {id: 3, author: "narrative_sam", content: "As the door creaked open, the musty scent of old paper and leather bindings washed over her. Inside, impossible towers of books stretched toward a vaulted ceiling that seemed to disappear into darkness. But what stopped Maya in her tracks wasn't the vastness of the collection—it was the soft sound of pages turning, though she could see no one else in the vast hall.", timestamp: "2024-06-02T09:15:00Z"}
            ]
        },
        {
            id: 2,
            title: "Moonlight Confessions",
            genre: "Romance",
            description: "A chance encounter under the full moon changes everything for two strangers.",
            createdBy: 2,
            createdDate: "2024-06-10",
            accessLevel: "approved_only",
            requireExamples: true,
            blockedUsers: [],
            approvedContributors: [1, 3],
            paragraphs: [
                {id: 1, author: "creative_alex", content: "The coffee shop's neon sign flickered against the midnight darkness as Elena fumbled for her keys. She hadn't planned to work this late, but the deadline for her novel wouldn't wait. The empty street stretched before her, illuminated only by the ethereal glow of the full moon overhead.", timestamp: "2024-06-10T11:00:00Z"},
                {id: 2, author: "storyteller_jane", content: "A soft melody drifted from the park across the street—someone was playing guitar. Despite her exhaustion, Elena found herself drawn to the music. There, sitting on a bench bathed in moonlight, was a figure she didn't recognize. The haunting melody seemed to speak directly to her writer's soul.", timestamp: "2024-06-10T16:45:00Z"}
            ]
        },
        {
            id: 3,
            title: "The Midnight Detective",
            genre: "Mystery",
            description: "Detective Walsh investigates a series of crimes that only happen at the stroke of midnight.",
            createdBy: 3,
            createdDate: "2024-06-15",
            accessLevel: "specific_users",
            requireExamples: false,
            blockedUsers: [2],
            approvedContributors: [1],
            paragraphs: [
                {id: 1, author: "narrative_sam", content: "Detective Walsh checked her watch for the third time in five minutes. 11:58 PM. The precinct was eerily quiet, but she knew that would change in exactly two minutes. For three weeks now, every crime in the city had occurred at precisely midnight—no exceptions, no deviations.", timestamp: "2024-06-15T08:00:00Z"}
            ]
        }
    ],
    genres: ["Science Fiction", "Romance", "Mystery", "Fantasy", "Horror", "Adventure", "Drama", "Comedy"],
    writingSamples: [
        {userId: 2, storyId: 2, content: "The rain pelted against the window as Sarah opened the letter that would change her life forever. Her hands trembled as she read the elegant script, each word more shocking than the last.", status: "approved", submittedDate: "2024-06-09"},
        {userId: 1, storyId: 3, content: "The old clock tower chimed thirteen times, an impossibility that sent chills down Marcus's spine. In all his years living in this town, he had never heard such a thing.", status: "approved", submittedDate: "2024-06-14"}
    ]
};