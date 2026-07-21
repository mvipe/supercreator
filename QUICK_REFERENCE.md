# Quick Reference - Two-Tier Subscription System

## 🎯 What Was Built

A complete **two-tier subscription system** with superadmin control, admin notifications, and automatic plan-based commissions.

## 🚀 Quick Start (3 Steps)

### Step 1: Run Database Schema
```
Supabase Console → SQL Editor
Copy & Paste: supabase/platform_settings.sql
Click: Run
```

### Step 2: Create Test Accounts
In Supabase, update `mp_profiles` table:
- Set one user's plan to `'superadmin'`
- Set one user's plan to `'admin'`

### Step 3: Test the System
1. **Superadmin**: Go to `/admin/settings` → Adjust commission rates
2. **Admin**: Go to `/admin/notifications` → Send test notification
3. **User**: Go to `/dashboard` → See notification card

## 📊 Commission Structure

| Plan | Commission Rate | Creator Keeps | Monthly Fee |
|------|-----------------|---------------|------------|
| Free | 30% (configurable) | 70% | $0 |
| Pro | 10% (configurable) | 90% | $4.99 (configurable) |

**Example**: ₹1000 course sale
- Free plan creator gets: ₹700 + monthly cost $0
- Pro plan creator gets: ₹900 + monthly cost $4.99

## 📁 Key Files

| File | Purpose |
|------|---------|
| `/admin/settings` | Superadmin sets commission % and pricing |
| `/admin/notifications` | Admin broadcasts to users |
| `/dashboard` | User sees notification card |
| `DashboardNotifications.jsx` | Notification component |
| `api/admin/settings` | Settings API |
| `api/admin/notifications` | Notification broadcast API |
| `api/notifications` | User notification fetch |

## 🔐 User Roles

| Role | Access | Can Do |
|------|--------|--------|
| **Superadmin** | `/admin/settings` | Set commission %, pro plan price |
| **Admin** | `/admin/notifications` | Send notifications to users |
| **Free User** | `/dashboard` | See notifications, pay 30% commission |
| **Pro User** | `/dashboard` | See notifications, pay 10% commission + $4.99/mo |

## 💾 Database Tables

```sql
mp_platform_settings
├─ id (1)
├─ free_plan_commission (30)
├─ pro_plan_commission (10)
└─ pro_plan_price (4.99)

mp_notifications
├─ id (uuid)
├─ title
├─ message
├─ type (info/success/warning/error)
├─ target_type (all/free_users/pro_users)
└─ published (boolean)

mp_user_notifications
├─ notification_id (fk)
├─ user_id (fk)
└─ read_at (timestamp)
```

## ✅ Testing Scenarios

**Scenario 1: Commission Configuration**
1. Login as superadmin
2. Set free commission to 25%
3. Set pro commission to 5%
4. Save
5. ✓ Settings persist in database

**Scenario 2: Send Notification**
1. Login as admin
2. Create notification: "New features available!"
3. Target: All Users
4. Send
5. ✓ Dashboard shows notification on 2+ user accounts

**Scenario 3: Plan-Based Filtering**
1. Admin sends "Upgrade to Pro" notification
2. Target: Free Users Only
3. Free user sees it ✓
4. Pro user doesn't see it ✓

## 🐛 Debugging

**Notification not appearing?**
- Verify user plan is set in mp_profiles
- Check notification target_type matches user's plan
- Ensure published = true in database

**Commission not saving?**
- Verify user has plan = 'superadmin'
- Check API response in browser DevTools
- Verify mp_platform_settings table was created

**"Unauthorized" error?**
- Confirm user's plan in mp_profiles table
- Check RLS policies are enabled on tables
- Verify session token is valid

## 📞 Need Help?

1. Check SYSTEM_ARCHITECTURE.md for detailed flows
2. Review SUBSCRIPTION_SYSTEM_SETUP.md for step-by-step guide
3. See IMPLEMENTATION_SUMMARY.md for file locations

## 🎉 What's Next?

Once tested and working:
1. **Update Payment Flow**: Fetch commission from mp_platform_settings during checkout
2. **Creator Earnings Dashboard**: Show net earnings after commission
3. **Admin Analytics**: Show notification delivery/read rates
4. **Scheduled Notifications**: Allow admins to schedule future broadcasts

---

**Everything is ready! Execute the SQL schema and start testing.**
