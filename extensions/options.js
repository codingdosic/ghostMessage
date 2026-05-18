// 설정 불러오기
chrome.storage.sync.get({ sortOrder: 'DESC' }, (items) => {
    document.getElementById('sortOrder').value = items.sortOrder;
});

// 설정 저장하기
document.getElementById('save').onclick = () => {
    const sortOrder = document.getElementById('sortOrder').value;
    chrome.storage.sync.set({ sortOrder }, () => {
        alert('설정이 저장되었습니다!');
    });
};