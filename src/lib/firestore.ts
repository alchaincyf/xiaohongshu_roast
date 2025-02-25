import { collection, addDoc, getDocs, query, orderBy, limit, startAfter, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { nanoid } from "nanoid";

// 吐槽记录类型定义
export interface RoastRecord {
  id?: string;
  createdAt: number;
  blogger: {
    nickname: string;
    avatar: string;
  };
  roast: string;
  url: string;
  shareId?: string;
}

// 保存吐槽记录到 Firestore
export async function saveRoast(data: Omit<RoastRecord, 'id' | 'createdAt' | 'shareId'>): Promise<string> {
  try {
    // 生成唯一的分享ID
    const shareId = nanoid(10);
    
    const docRef = await addDoc(collection(db, "roasts"), {
      ...data,
      createdAt: Date.now(),
      shareId
    });
    
    console.log("保存吐槽记录成功，ID:", docRef.id);
    return shareId;
  } catch (error) {
    console.error("保存吐槽记录失败:", error);
    throw error;
  }
}

// 获取最近的吐槽记录
export async function getRecentRoasts(lastDoc = null, itemsPerPage = 10): Promise<{roasts: RoastRecord[], lastDoc: any}> {
  try {
    let roastsQuery;
    
    if (lastDoc) {
      roastsQuery = query(
        collection(db, "roasts"),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(itemsPerPage)
      );
    } else {
      roastsQuery = query(
        collection(db, "roasts"),
        orderBy("createdAt", "desc"),
        limit(itemsPerPage)
      );
    }
    
    const querySnapshot = await getDocs(roastsQuery);
    const roasts: RoastRecord[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<RoastRecord, 'id'>;
      roasts.push({
        id: doc.id,
        ...data
      });
    });
    
    const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    
    return {
      roasts,
      lastDoc: newLastDoc
    };
  } catch (error) {
    console.error("获取吐槽记录失败:", error);
    throw error;
  }
}

// 通过分享ID获取吐槽记录
export async function getRoastByShareId(shareId: string): Promise<RoastRecord | null> {
  try {
    const roastsRef = collection(db, "roasts");
    const q = query(roastsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    let roast: RoastRecord | null = null;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.shareId === shareId) {
        roast = {
          id: doc.id,
          ...data
        } as RoastRecord;
      }
    });
    
    return roast;
  } catch (error) {
    console.error("通过分享ID获取吐槽记录失败:", error);
    return null;
  }
} 