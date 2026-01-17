# 🐛 PROJECTS NOT SAVING - DEBUG GUIDE

## 🔍 **Let's Debug This!**

If projects aren't saving, let's find out why:

---

## ✅ **Quick Test - Run in Browser Console:**

### **Step 1: Open Browser Console**
```
Press F12 or Right-click → Inspect → Console tab
```

### **Step 2: Check if localStorage works:**
```javascript
// Test basic localStorage
localStorage.setItem('test', 'hello');
console.log(localStorage.getItem('test'));
// Should print: "hello"

// Check if projects exist
const projects = localStorage.getItem('reel_composer_projects');
console.log('Saved projects:', projects);
// If null → Nothing saved yet
// If string → Projects exist!
```

### **Step 3: Test manual save:**
```javascript
// Save a test project directly
const testProject = {
  id: 'test_123',
  name: 'Test Project',
  html: '<div>Test</div>',
  layoutConfig: [],
  srtText: 'test',
  topicContext: 'test',
  bgMusicVolume: 0.2,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

localStorage.setItem('reel_composer_projects', JSON.stringify([testProject]));

// Now check Projects button - should see "Test Project"
console.log('✅ Test project saved!');
```

---

## 🔎 **Common Issues:**

### **Issue 1: localStorage Disabled**
**Symptom:** Nothing saves, no errors  
**Cause:** Browser privacy settings  
**Solution:**
```
Chrome: Settings → Privacy → Cookies → Allow all
Firefox: Settings → Privacy → Custom → Cookies allowed
Safari: Preferences → Privacy → Uncheck "Block all cookies"
```

### **Issue 2: Private/Incognito Mode**
**Symptom:** Saves work but disappear on refresh  
**Cause:** Incognito doesn't persist localStorage  
**Solution:** Use normal browser mode

### **Issue 3: Storage Quota Exceeded**
**Symptom:** Save fails silently  
**Test:**
```javascript
// Check storage space
if ('storage' in navigator && 'estimate' in navigator.storage) {
  navigator.storage.estimate().then(est => {
    console.log('Used:', Math.round(est.usage / 1024), 'KB');
    console.log('Quota:', Math.round(est.quota / 1024 / 1024), 'MB');
  });
}
```

### **Issue 4: Browser Doesn't Support localStorage**
**Very rare, but possible**
**Test:**
```javascript
if (typeof(Storage) === "undefined") {
  console.error('localStorage not supported!');
} else {
  console.log('✅ localStorage is supported');
}
```

---

## 🧪 **STEP-BY-STEP DEBUG:**

### **Test Save Button:**

1. **Generate some content in the app**
2. **Open browser console (F12)**
3. **Click "Save" button**
4. **Watch console for errors**

If you see errors, copy them!

### **Manual Save Test:**

Run this in console AFTER generating content:
```javascript
// Get the save function from the page
// (This tests if the save logic works)

const testSave = () => {
  try {
    const project = {
      name: 'Debug Test',
      html: '<div>Test HTML</div>',
      layoutConfig: [{startTime: 0, endTime: 10}],
      srtText: '1\n00:00:00,000 --> 00:00:01,000\nTest',
      topicContext: 'Test context',
      bgMusicVolume: 0.2
    };
    
    // Get existing projects
    const existing = JSON.parse(localStorage.getItem('reel_composer_projects') || '[]');
    
    // Add new project
    const newProject = {
      ...project,
      id: `proj_${Date.now()}_debug`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    existing.unshift(newProject);
    
    // Save
    localStorage.setItem('reel_composer_projects', JSON.stringify(existing));
    
    console.log('✅ Manual save successful!');
    console.log('Saved project:', newProject);
    
    // Verify
    const check = JSON.parse(localStorage.getItem('reel_composer_projects'));
    console.log('Total projects now:', check.length);
    
    return true;
  } catch (e) {
    console.error('❌ Save failed:', e);
    return false;
  }
};

testSave();
```

---

## 📊 **Check What's Actually Saved:**

```javascript
// View all saved projects
const projects = JSON.parse(localStorage.getItem('reel_composer_projects') || '[]');
console.log('📁 Number of projects:', projects.length);
console.log('📋 Projects:', projects.map(p => ({
  name: p.name,
  created: new Date(p.createdAt).toLocaleString(),
  hasHTML: !!p.html,
  hasConfig: !!p.layoutConfig
})));
```

---

## 🔧 **FIX: Clear and Restart**

If things are broken:

```javascript
// Clear all saved projects
localStorage.removeItem('reel_composer_projects');
console.log('🗑️ Cleared all projects');

// Refresh page
location.reload();
```

---

## 🎯 **EXPECTED BEHAVIOR:**

### **When You Save:**
1. Click "Save" button
2. Prompt appears: "Name your project:"
3. Enter name → Click OK
4. Alert: "✅ Project saved successfully!"
5. Click "Projects" → See it in the list

### **What You Should See in Console:**
```javascript
// After clicking Save
✅ Project saved successfully!

// After clicking Projects
Loading projects...
Found 1 project(s)
```

---

## 🚨 **TELL ME:**

After running these tests, please tell me:

1. **Does localStorage work?** (Step 2 test)
2. **Any console errors?** (Copy them)
3. **Does manual save work?** (testSave() function)
4. **How many projects show?** (Check localStorage)
5. **Are you in incognito mode?**

---

## 💡 **Quick Checks:**

```javascript
// Run all checks at once
console.log('=== REEL COMPOSER DEBUG ===');
console.log('1. localStorage supported?', typeof(Storage) !== 'undefined');
console.log('2. Can write?', (() => { try { localStorage.setItem('t','t'); return true; } catch { return false; }})());
console.log('3. Saved projects:', JSON.parse(localStorage.getItem('reel_composer_projects') || '[]').length);
console.log('4. Browser:', navigator.userAgent.match(/Chrome|Firefox|Safari|Edge/)?.[0] || 'Unknown');
console.log('5. Private mode?', (() => { try { return window.indexedDB ? 'No' : 'Maybe'; } catch { return 'Yes'; }})());
console.log('========================');
```

**Run this and send me the output!** 📋
