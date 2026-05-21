import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Hazard, RouteOption } from './types.ts';
import { auth, db, handleFirestoreError, OperationType } from './firebase.ts';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import {
  collection, 
  onSnapshot, 
  addDoc, 
  setDoc,
  getDoc,
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocFromServer,
  runTransaction,
  increment,
  updateDoc,
  where,
  limit,
  getDocs,
  getCountFromServer,
  collectionGroup,
  writeBatch
} from 'firebase/firestore';
import { Verification, Comment, Media, ActivityItem, NotificationLog } from './types.ts';

interface AppContextType {
  user: User | null;
  loading: boolean;
  hazards: Hazard[];
  addHazard: (hazard: Partial<Hazard>) => Promise<void>;
  verifyHazard: (hazardId: string, status: 'valid' | 'invalid') => Promise<void>;
  archiveHazard: (hazardId: string) => Promise<void>;
  addComment: (hazardId: string, content: string) => Promise<void>;
  addMedia: (hazardId: string, url: string, type: 'image' | 'video') => Promise<void>;
  fetchUserProfileStats: (userId: string) => Promise<{ pinsAdded: number; verifications: number }>;
  fetchRecentActivity: (userId: string) => Promise<ActivityItem[]>;
  logNotification: (userId: string, type: 'proximity_alert' | 'nav_risk', message: string, hazardId?: string) => Promise<void>;
  fetchAllVerifications: () => Promise<Verification[]>;
  fetchAllNotificationLogs: () => Promise<NotificationLog[]>;
  purgeNotificationLogs: () => Promise<void>;
  updateHazardStatus: (hazardId: string, status: 'active' | 'archived') => Promise<void>;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  availableRoutes: RouteOption[];
  selectedRoute: RouteOption | null;
  setSelectedRoute: (route: RouteOption | null) => void;
  destinationPosition: [number, number] | null;
  setDestinationPosition: (pos: [number, number] | null) => void;
  userPosition: [number, number] | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [destinationPosition, setDestinationPosition] = useState<[number, number] | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [availableRoutes, setAvailableRoutes] = useState<RouteOption[]>([]);

  // Geolocation tracking in context
  useEffect(() => {
    let watchId: string;

    const startTracking = async () => {
      try {
        const permissions = await Geolocation.checkPermissions();
        if (permissions.location === 'denied' || permissions.location === 'prompt' || permissions.location === 'prompt-with-description') {
          await Geolocation.requestPermissions();
        }

        watchId = await Geolocation.watchPosition({
          enableHighAccuracy: true,
          timeout: 10000
        }, (position) => {
          if (position) {
            const newPos: [number, number] = [position.coords.latitude, position.coords.longitude];
            setUserPosition(newPos);
          }
        });
      } catch (error) {
        console.error("Geolocation error:", error);
      }
    };

    startTracking();

    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }, []);

  // Update routes when destination changes
  // Redundant routing logic removed to rely on MapView direct integration

  // Test connection on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Handle redirect result for mobile OAuth
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log("Redirect login successful");
        }
      } catch (error) {
        console.error("Redirect Error:", error);
      }
    };
    handleRedirect();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          try {
              const userDoc = await getDoc(userDocRef);
              const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
              const isAdmin = adminDoc.exists();

              if (userDoc.exists()) {
                const userData = userDoc.data() as User;
                setUser({
                  ...userData,
                  role: isAdmin ? 'admin' : 'user'
                });
              } else {
                // Initial default profile if not exists
                const newUser: User = {
                  id: firebaseUser.uid,
                  name: firebaseUser.displayName || 'SafeWalker',
                  email: firebaseUser.email || '',
                  reputation: 0,
                  avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&h=200&auto=format&fit=crop',
                  role: isAdmin ? 'admin' : 'user',
                  createdAt: serverTimestamp()
                };
                try {
                  await setDoc(userDocRef, newUser);
                  setUser(newUser);
                } catch (err) {
                  handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
                }
              }
          } catch (error) {
              handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth observer error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to hazards
  useEffect(() => {
    if (!auth.currentUser) return;

    const hazardsQuery = query(collection(db, 'hazards'), orderBy('createdAt', 'desc'));
    const unsubscribeHazards = onSnapshot(hazardsQuery, (snapshot) => {
      const hazardData: Hazard[] = snapshot.docs.map(doc => ({
        ...(doc.data() as Hazard),
        id: doc.id
      }));
      setHazards(hazardData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'hazards');
    });

    return () => unsubscribeHazards();
  }, [user]);

  const isAuthenticated = !!user;

  const login = async (email: string, password?: string) => {
    try {
        if (!password) throw new Error("Password is required");
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Login Error", error);
        throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        console.error("Reset Password Error", error);
        throw error;
    }
  };

  const loginWithGoogle = async () => {
    console.log("Starting Google Login. Origin:", window.location.origin);
    try {
        const provider = new GoogleAuthProvider();

        if (Capacitor.isNativePlatform()) {
          // Redirect is more stable than Popup on Android WebViews
          await signInWithRedirect(auth, provider);
        } else {
          await signInWithPopup(auth, provider);
        }
    } catch (error: any) {
        console.error("Google Login Error:", error);
        if (error.code === 'auth/unauthorized-domain') {
          throw new Error(`Domain Unauthorized: Please ensure '${window.location.origin}' is added to Authorized Domains in Firebase Console.`);
        }
        throw error;
    }
  };

  const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error", error);
    }
  };

  const addHazard = async (hazard: Partial<Hazard>) => {
    if (!auth.currentUser || !user) return;
    
    const hazardData = {
      ...hazard,
      reporterId: auth.currentUser.uid,
      reporterName: user.name,
      reporterAvatar: user.avatar,
      status: 'active',
      verificationCount: 0,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'hazards'), hazardData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'hazards');
    }
  };

  const verifyHazard = async (hazardId: string, status: 'valid' | 'invalid') => {
    if (!auth.currentUser || !user) return;

    const verificationRef = doc(db, `hazards/${hazardId}/verifications/${auth.currentUser.uid}`);
    const hazardRef = doc(db, 'hazards', hazardId);

    try {
      await runTransaction(db, async (transaction) => {
        const hazardSnap = await transaction.get(hazardRef);
        if (!hazardSnap.exists()) throw new Error("Hazard does not exist");

        const verificationSnap = await transaction.get(verificationRef);
        const existingStatus = verificationSnap.exists() ? (verificationSnap.data() as Verification).status : null;

        // 1. Save verification
        transaction.set(verificationRef, {
          userId: auth.currentUser!.uid,
          hazardId,
          status,
          timestamp: serverTimestamp()
        });

        // 2. Aggregate count
        let countChange = 0;
        if (existingStatus === null) {
          countChange = status === 'valid' ? 1 : -1;
        } else if (existingStatus !== status) {
          countChange = status === 'valid' ? 2 : -2; // Switch from invalid to valid or vice versa
        }

        if (countChange !== 0) {
          transaction.update(hazardRef, {
            verificationCount: increment(countChange)
          });

          // 3. Reputation scoring trigger (e.g., if total verificationCount hits a threshold)
          const newCount = (hazardSnap.data().verificationCount || 0) + countChange;
          if (newCount >= 10 && (hazardSnap.data().verificationCount || 0) < 10) {
            const reporterRef = doc(db, 'users', hazardSnap.data().reporterId);
            transaction.update(reporterRef, {
              reputation: increment(10)
            });
          }
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `hazards/${hazardId}/verifications/${auth.currentUser.uid}`);
    }
  };

  const archiveHazard = async (hazardId: string) => {
    if (!auth.currentUser || !user) return;
    try {
      await updateDoc(doc(db, 'hazards', hazardId), {
        status: 'archived'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `hazards/${hazardId}`);
    }
  };

  const addComment = async (hazardId: string, content: string) => {
    if (!auth.currentUser || !user) return;
    const commentData: Partial<Comment> = {
      hazardId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      content,
      createdAt: serverTimestamp()
    };
    try {
      await addDoc(collection(db, `hazards/${hazardId}/comments`), commentData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `hazards/${hazardId}/comments`);
    }
  };

  const addMedia = async (hazardId: string, url: string, type: 'image' | 'video') => {
    if (!auth.currentUser || !user) return;
    const mediaData: Partial<Media> = {
      hazardId,
      userId: user.id,
      url,
      type,
      createdAt: serverTimestamp()
    };
    try {
      await addDoc(collection(db, `hazards/${hazardId}/media`), mediaData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `hazards/${hazardId}/media`);
    }
  };

  const fetchUserProfileStats = async (userId: string) => {
    try {
      const hQuery = query(collection(db, 'hazards'), where('reporterId', '==', userId));
      const hSnap = await getCountFromServer(hQuery);
      
      const vQuery = query(collectionGroup(db, 'verifications'), where('userId', '==', userId));
      const vSnap = await getCountFromServer(vQuery);
      
      return {
        pinsAdded: hSnap.data().count,
        verifications: vSnap.data().count
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `stats/user/${userId}`);
      return { pinsAdded: 0, verifications: 0 };
    }
  };

  const fetchRecentActivity = async (userId: string): Promise<ActivityItem[]> => {
    try {
      const hQuery = query(
        collection(db, 'hazards'), 
        where('reporterId', '==', userId), 
        limit(10)
      );
      const hSnap = await getDocs(hQuery);
      const hazardActs: ActivityItem[] = hSnap.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              type: 'HAZARD_REPORTED',
              title: `Reported Hazard: ${data.title}`,
              timestamp: data.createdAt?.toDate() || new Date(),
              statusText: 'SAFETY REPORT'
          };
      });

      const vQuery = query(
        collectionGroup(db, 'verifications'), 
        where('userId', '==', userId), 
        limit(10)
      );
      const vSnap = await getDocs(vQuery);
      
      const verifActs: ActivityItem[] = await Promise.all(vSnap.docs.map(async vDoc => {
          const vData = vDoc.data();
          const hazardId = vData.hazardId;
          const hazardDoc = await getDoc(doc(db, 'hazards', hazardId));
          const hazardTitle = hazardDoc.exists() ? hazardDoc.data().title : 'Unknown Location';
          
          return {
              id: vDoc.id,
              type: 'HAZARD_VERIFIED',
              title: `Verified ${vData.status === 'valid' ? 'Safe' : 'Hazard'} Path at ${hazardTitle}`,
              timestamp: vData.timestamp?.toDate() || new Date(),
              statusText: 'COMMUNITY TRUST'
          };
      }));

      return [...hazardActs, ...verifActs]
          .sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
            const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
            return timeB - timeA;
          })
          .slice(0, 10);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `activity/user/${userId}`);
      return [];
    }
  };

  const logNotification = async (userId: string, type: 'proximity_alert' | 'nav_risk', message: string, hazardId?: string) => {
    try {
      await addDoc(collection(db, 'notification_logs'), {
        userId,
        type,
        message,
        hazardId: hazardId || null,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error logging notification:", error);
    }
  };

  const fetchAllVerifications = async (): Promise<Verification[]> => {
    try {
      const q = query(collectionGroup(db, 'verifications'), orderBy('timestamp', 'desc'), limit(100));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ ...doc.data() } as Verification));
    } catch (error) {
      console.error("Error fetching all verifications:", error);
      return [];
    }
  };

  const fetchAllNotificationLogs = async (): Promise<NotificationLog[]> => {
    try {
      const q = query(collection(db, 'notification_logs'), orderBy('timestamp', 'desc'), limit(100));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as NotificationLog));
    } catch (error) {
      console.error("Error fetching all notification logs:", error);
      return [];
    }
  };

  const purgeNotificationLogs = async () => {
    try {
      const q = query(collection(db, 'notification_logs'), limit(500));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      console.error("Error purging notification logs:", error);
    }
  };

  const updateHazardStatus = async (hazardId: string, status: 'active' | 'archived') => {
    try {
      await updateDoc(doc(db, 'hazards', hazardId), { status });
    } catch (error) {
      console.error("Error updating hazard status:", error);
    }
  };

  return (
    <AppContext.Provider value={{ 
      user, 
      loading, 
      hazards, 
      addHazard, 
      verifyHazard,
      archiveHazard,
      addComment,
      addMedia,
      fetchUserProfileStats,
      fetchRecentActivity,
      logNotification,
      fetchAllVerifications,
      fetchAllNotificationLogs,
      purgeNotificationLogs,
      updateHazardStatus,
      isAuthenticated, 
      login, 
      resetPassword,
      loginWithGoogle, 
      logout,
      availableRoutes,
      selectedRoute,
      setSelectedRoute,
      destinationPosition,
      setDestinationPosition,
      userPosition
    }}>
      {!loading && children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
