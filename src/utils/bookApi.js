/**
 * Book Search API Handler
 * 
 * Strategy:
 * 1. Google Books API (Client-side) - Primary
 * 2. Open Library API (Client-side Fallback) - Secondary
 * 3. Mock Data (Final Fallback) - Demo Mode
 */

export async function searchBook(query) {
    if (!query) return [];

    try {
        // 1. Google Books API
        // Strategy: First try with API Key. If that fails (403 Permission), retry without Key (Anonymous).
        const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;
        let googleResponse;

        // Attempt 1: With Key (if available)
        if (API_KEY) {
            console.log("Attempting Search with Key:", API_KEY.substring(0, 10) + "...");
            try {
                const urlWithKey = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&key=${API_KEY}`;
                googleResponse = await fetch(urlWithKey);

                // If 403 Forbidden (Key valid but Books API not enabled), throw to trigger retry
                if (googleResponse.status === 403) {
                    try {
                        const errData = await googleResponse.json();
                        console.error("Google Books 403 Error Detailed Reason:", JSON.stringify(errData, null, 2));
                    } catch (jsonErr) {
                        console.error("Google Books 403 Error (Could not parse body)");
                    }
                    console.warn("Google API Key 403 (Permission Missing). Retrying anonymously...");
                    throw new Error("KEY_PERMISSION_ERROR");
                }
            } catch (e) {
                // If network error, throw up. If Key error, swallow and let Attempt 2 run.
                if (e.message !== "KEY_PERMISSION_ERROR") throw e;
            }
        }

        // Attempt 2: Anonymous (No Key) - used if no Key or Key failed
        if (!googleResponse || !googleResponse.ok) {
            const urlNoKey = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`;
            googleResponse = await fetch(urlNoKey);
        }

        if (!googleResponse.ok) {
            throw new Error(`Google API Status: ${googleResponse.status}`);
        }

        const googleData = await googleResponse.json();

        if (googleData.items) {
            return googleData.items.map(item => {
                const info = item.volumeInfo;
                let image = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
                if (image && image.startsWith('http://')) image = image.replace('http://', 'https://');

                return {
                    title: info.title || '제목 없음',
                    author: info.authors ? info.authors.join(', ') : '저자 미상',
                    image: image,
                    isbn: info.industryIdentifiers?.[0]?.identifier || item.id,
                    publisher: info.publisher || '',
                    pubdate: info.publishedDate || '',
                    description: info.description || ''
                };
            });
        }

    } catch (googleError) {
        console.warn("Google Books Failed (Switching to Open Library):", googleError.message);

        try {
            // 2. Open Library Fallback (No Key Required)
            const olResponse = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`);

            if (!olResponse.ok) throw new Error("Open Library Failed");

            const olData = await olResponse.json();

            if (olData.docs && olData.docs.length > 0) {
                return olData.docs.slice(0, 10).map(doc => ({
                    title: doc.title,
                    author: doc.author_name ? doc.author_name.slice(0, 3).join(', ') : '저자 미상',
                    image: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '',
                    isbn: doc.isbn ? doc.isbn[0] : Math.random().toString().slice(2, 12),
                    publisher: doc.publisher ? doc.publisher[0] : 'Open Library',
                    pubdate: doc.first_publish_year ? doc.first_publish_year.toString() : '',
                    description: `Open Library에서 검색된 도서입니다.`
                }));
            }

        } catch (olError) {
            console.warn("Open Library Failed (Using Mock Data):", olError.message);
        }
    }

    // 3. Final Mock Data Fallback
    return getMockBooks(query);
}

/**
 * Legacy: National Library of Korea (NL) API
 * - Currently unused but kept for reference.
 * - Issues: Inconsistent image URLs and field names.
 */
// eslint-disable-next-line no-unused-vars
async function searchBookReview(query) {
    const API_KEY = import.meta.env.VITE_NL_API_KEY;
    // ... Implementation removed to avoid confusion, keeping function stub
    return [];
}

// Fallback / Mock Data Generator
function getMockBooks(query) {
    console.warn("Using Mock Data for:", query);
    return new Promise((resolve) => {
        setTimeout(() => {
            const mockItems = [
                {
                    title: query ? query : '독서의 발견',
                    author: '김명상',
                    image: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=200',
                    isbn: '979110000001',
                    publisher: '지혜의숲',
                    description: '검색 API 한도 초과(429)로 인해 표시되는 예시 도서입니다. 실제 독서 기록 기능은 정상 작동합니다.'
                },
                {
                    title: `성공하는 ${query || '습관'}의 비밀`,
                    author: '홍길동',
                    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200',
                    isbn: '979110000002',
                    publisher: '성공북스',
                    description: '이 데이터는 데모용 가상 데이터입니다.'
                },
                {
                    title: `${query || '독서'} 완벽 가이드`,
                    author: '제인 도',
                    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=200',
                    isbn: '979110000003',
                    publisher: '테크미디어',
                    description: 'Google Books API 트래픽 제한 시 나타나는 대체 항목입니다.'
                },
                {
                    title: `어린왕자와 ${query || '여행'}`,
                    author: '생텍쥐페리',
                    image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=200',
                    isbn: '979110000004',
                    publisher: '클래식북',
                    description: '고전 명작 다시 읽기.'
                }
            ];
            resolve(mockItems);
        }, 300);
    });
}
