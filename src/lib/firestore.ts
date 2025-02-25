import { collection, addDoc, getDocs, query, orderBy, limit, startAfter, doc, getDoc, where } from "firebase/firestore";
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
  bloggerId?: string;
}

// 保存吐槽记录到 Firestore
export async function saveRoast(data: Omit<RoastRecord, 'id' | 'createdAt' | 'shareId' | 'bloggerId'>): Promise<string> {
  try {
    // 生成唯一的分享ID
    const shareId = nanoid(10);
    
    // 基于URL创建博主唯一标识
    let bloggerId = '';
    
    // 尝试从URL中提取博主ID
    const urlMatch = data.url.match(/\/user\/([^\/\?]+)/);
    if (urlMatch && urlMatch[1]) {
      bloggerId = urlMatch[1];
    } else {
      // 否则使用URL域名部分+昵称生成唯一标识
      const urlObj = new URL(data.url);
      const domain = urlObj.hostname;
      const path = urlObj.pathname.replace(/[\/\-\_\.\?\=]/g, '');
      bloggerId = `${domain}_${path}_${data.blogger.nickname}`.substring(0, 40);
    }
    
    const docRef = await addDoc(collection(db, "roasts"), {
      ...data,
      bloggerId,
      createdAt: Date.now(),
      shareId
    });
    
    console.log("保存吐槽记录成功，ID:", docRef.id, "博主ID:", bloggerId);
    return shareId;
  } catch (error) {
    console.error("保存吐槽记录失败:", error);
    throw error;
  }
}

// 获取最近的吐槽记录
export async function getRecentRoasts(
  lastDoc: firebase.firestore.QueryDocumentSnapshot | null = null, 
  itemsPerPage = 10
): Promise<{roasts: RoastRecord[], lastDoc: firebase.firestore.QueryDocumentSnapshot | null}> {
  try {
    // 增加查询数量，以补偿可能被过滤和聚合后的记录减少
    const adjustedLimit = itemsPerPage * 3;
    
    let roastsQuery;
    
    if (lastDoc) {
      roastsQuery = query(
        collection(db, "roasts"),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(adjustedLimit)
      );
    } else {
      roastsQuery = query(
        collection(db, "roasts"),
        orderBy("createdAt", "desc"),
        limit(adjustedLimit)
      );
    }
    
    const querySnapshot = await getDocs(roastsQuery);
    const roastsMap = new Map<string, RoastRecord>(); // 使用Map聚合同一博主的记录
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<RoastRecord, 'id'>;
      
      // 过滤掉包含错误信息的记录
      const containsErrorMessage = 
        data.roast.includes("很抱歉，AI在生成吐槽时遇到了一些问题") || 
        data.roast.includes("处理请求时发生错误") ||
        data.roast.length < 50; // 过滤掉过短的内容，可能是错误消息
      
      if (!containsErrorMessage) {
        const roast: RoastRecord = {
          id: doc.id,
          ...data
        };
        
        // 确定博主ID - 如果数据中没有，则根据URL和昵称创建一个临时ID
        const bloggerId = data.bloggerId || 
          `${data.url.replace(/[^a-zA-Z0-9]/g, '')}_${data.blogger.nickname}`;
        
        // 只保留最新的记录（如果已有记录，比较创建时间）
        if (!roastsMap.has(bloggerId) || 
            data.createdAt > roastsMap.get(bloggerId)!.createdAt) {
          roastsMap.set(bloggerId, roast);
        }
      }
    });
    
    // 将Map转为数组并按时间排序
    const uniqueRoasts = Array.from(roastsMap.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, itemsPerPage);
    
    // 如果聚合后的记录不足请求数量且还有更多记录，则递归获取更多
    if (uniqueRoasts.length < itemsPerPage && querySnapshot.docs.length >= adjustedLimit) {
      const lastDocFromBatch = querySnapshot.docs[querySnapshot.docs.length - 1];
      const nextBatch = await getRecentRoasts(lastDocFromBatch, itemsPerPage - uniqueRoasts.length);
      
      // 继续聚合，防止重复
      for (const roast of nextBatch.roasts) {
        const bloggerId = roast.bloggerId || 
          `${roast.url.replace(/[^a-zA-Z0-9]/g, '')}_${roast.blogger.nickname}`;
        
        // 只添加不存在的博主
        if (!roastsMap.has(bloggerId)) {
          uniqueRoasts.push(roast);
          if (uniqueRoasts.length >= itemsPerPage) break;
        }
      }
    }
    
    const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    
    return {
      roasts: uniqueRoasts,
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

// 获取特定博主的历史吐槽记录
export async function getBloggerRoastHistory(bloggerId: string, limit = 10): Promise<RoastRecord[]> {
  try {
    // 查询特定博主ID的所有记录
    const roastsQuery = query(
      collection(db, "roasts"),
      where("bloggerId", "==", bloggerId),
      orderBy("createdAt", "desc"),
      limit(limit)
    );
    
    const querySnapshot = await getDocs(roastsQuery);
    const roasts: RoastRecord[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<RoastRecord, 'id'>;
      
      // 依然过滤错误信息
      const containsErrorMessage = 
        data.roast.includes("很抱歉，AI在生成吐槽时遇到了一些问题") || 
        data.roast.includes("处理请求时发生错误") ||
        data.roast.length < 50;
      
      if (!containsErrorMessage) {
        roasts.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    return roasts;
  } catch (error) {
    console.error("获取博主历史吐槽失败:", error);
    return [];
  }
} 