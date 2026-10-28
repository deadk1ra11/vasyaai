# Firebase Realtime Database — рекомендуемые Security Rules для LinkUp

Клиентская проверка ника **не** обеспечивает безопасность. Обычный пользователь теоретически может отправить запрос `update` с `role: "owner"` или `premium.active: true`, если Rules это разрешают.

## Рекомендуемые правила (минимально безопасный вариант)

В Firebase Console → Realtime Database → Rules:

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid && (!data.exists() || (
          !newData.hasChild('role') || newData.child('role').val() === data.child('role').val() ||
          (data.child('displayName').val().toLowerCase() === 'deadk1ra' && newData.child('role').val() === 'owner')
        )) && (
          !newData.hasChild('premium') ||
          newData.child('premium').val() === data.child('premium').val() ||
          root.child('users').child(auth.uid).child('role').val() === 'owner' ||
          root.child('users').child(auth.uid).child('role').val() === 'admin'
        )",
        "premiumSettings": {
          ".write": "auth != null && auth.uid === $uid"
        },
        "displayName": { ".validate": "newData.isString() && newData.val().length <= 40" },
        "bio": { ".validate": "newData.isString() && newData.val().length <= 200" }
      }
    },

    "posts": {
      ".read": "auth != null",
      "$postId": {
        ".write": "auth != null && (!data.exists() || data.child('authorId').val() === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'owner')",
        "likes": {
          "$uid": { ".write": "auth != null && auth.uid === $uid" }
        },
        "reactions": {
          "$emoji": {
            "$uid": { ".write": "auth != null && auth.uid === $uid" }
          }
        },
        "likesCount": { ".write": "auth != null" },
        "commentsCount": { ".write": "auth != null" }
      }
    },

    "comments": {
      "$postId": {
        ".read": "auth != null",
        "$cid": {
          ".write": "auth != null && (!data.exists() || data.child('authorId').val() === auth.uid)"
        }
      }
    },

    "notifications": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null"
      }
    },

    "follows": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "followers": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },

    "chats": {
      "$chatId": {
        ".read": "auth != null",
        "messages": {
          "$mid": {
            ".write": "auth != null && newData.child('senderId').val() === auth.uid"
          }
        }
      }
    },
    "userChats": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null"
      }
    },

    "premiumLogs": {
      ".read": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'owner' || root.child('users').child(auth.uid).child('role').val() === 'admin')",
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'owner' || root.child('users').child(auth.uid).child('role').val() === 'admin')"
    }
  }
}
```

## Важно

1. **Один раз** зайдите под аккаунтом `deadk1ra` — код сам проставит `role: "owner"` (если Rules разрешают self-heal для этого ника).
2. Если self-heal блокируется Rules, вручную в Console → Data → `users/{ваш_uid}` поставьте `role: "owner"`.
3. Для продакшена лучше вынести выдачу Premium в **Cloud Functions** (Admin SDK), чтобы клиент вообще не мог писать `premium` и `role`.
4. Не открывайте `.read: true` / `.write: true` на корень базы.

## Структура данных Premium

```
users/{uid}/premium: {
  active: true,
  until: 1735689600000 | null,   // null = бессрочно
  grantedAt: 1234567890,
  grantedBy: "uid_admin"
}
users/{uid}/premiumSettings: { statusText, statusStyle, frame, effect, theme, accentColor, showShowcase, showcase }
users/{uid}/role: "owner" | "admin" | "user"
premiumLogs/{pushId}: { action, targetUid, targetName, byUid, byName, until, reason, at }
```
