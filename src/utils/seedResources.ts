/**
 * 기본 공간(자원) 데이터를 Firestore에 추가하는 스크립트
 * 사용법: Firebase Console > Firestore에서 직접 추가하거나, 
 *        이 데이터를 참고하여 앱 내에서 시드 기능 구현
 */

export const DEFAULT_RESOURCES = [
    {
        name: "멀티미디어실 1",
        type: "room",
        description: "멀티미디어 장비가 구비된 실습실",
        capacity: 6,
    },
    {
        name: "멀티미디어실 2",
        type: "room",
        description: "멀티미디어 장비가 구비된 실습실",
        capacity: 6,
    },
    {
        name: "멀티미디어실 3",
        type: "room",
        description: "멀티미디어 장비가 구비된 실습실",
        capacity: 6,
    },
    {
        name: "401호",
        type: "room",
        description: "강의실",
        capacity: 26,
    },
    {
        name: "427호",
        type: "room",
        description: "세미나실",
        capacity: 26,
    },
];

/**
 * Firestore에 기본 공간을 추가하는 함수
 */
export async function seedResources() {
    // 이 함수는 앱에서 한 번만 실행되어야 합니다.
    const { collection, addDoc, getDocs, serverTimestamp, query, updateDoc, doc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");

    // 기존 데이터 확인
    const resourcesRef = collection(db, "resources");
    const existingSnapshot = await getDocs(query(resourcesRef));

    if (existingSnapshot.docs.length > 0) {
        // 기존 리소스가 있으면 수용 인원 업데이트
        console.log("Resources exist, updating capacities...");

        const capacityMap: Record<string, number> = {
            "멀티미디어실 1": 6,
            "멀티미디어실 2": 6,
            "멀티미디어실 3": 6,
            "401호": 26,
            "427호": 26,
        };

        const updatePromises = existingSnapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const newCapacity = capacityMap[data.name];
            if (newCapacity && data.capacity !== newCapacity) {
                await updateDoc(doc(db, "resources", docSnap.id), { capacity: newCapacity });
                console.log(`Updated ${data.name} capacity to ${newCapacity}`);
            }
        });

        await Promise.all(updatePromises);
        return { seeded: false, updated: true, count: existingSnapshot.docs.length };
    }

    // 새 데이터 추가
    const promises = DEFAULT_RESOURCES.map(resource =>
        addDoc(resourcesRef, {
            ...resource,
            created_at: serverTimestamp(),
        })
    );

    await Promise.all(promises);
    console.log(`Seeded ${DEFAULT_RESOURCES.length} resources.`);

    return { seeded: true, count: DEFAULT_RESOURCES.length };
}

