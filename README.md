todo

矢量切换位图时区分两个质量
低质量用于快速渲染
高质量在worker中进行，完成后替换

修复切换layer和drawlayer时的闪烁问题

12-8
Layer只渲染位图 DrawLayer只渲染矢量图
undo redo不改变activeKey
