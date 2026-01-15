const Themes={
    toggleTheme() {
        const theme = document.querySelector('.theme')
        if (document.body.getAttribute('data-theme') === 'dark') {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            if (theme) {
                theme.textContent = '夜间模式';
            }
            console.log('设置为日间模式');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            if (theme) {
                theme.textContent = '日间模式';
            }
            console.log('设置为夜间模式');
            
        }
    }
}

export default Themes;