# Kashot design system

## Nguyên tắc

- Không có một màu duy nhất được chứng minh là luôn làm người học học tốt hơn. Ảnh hưởng của màu phụ thuộc loại và độ khó của nhiệm vụ; bằng chứng về hiệu ứng “màu đỏ làm giảm thành tích” cũng không bền vững qua phân tích tổng hợp.
- Màu chỉ làm nhiệm vụ dẫn hướng. Nội dung, tương phản, phân cấp và phản hồi học tập mới là phần chính.
- Chữ thường phải đạt tương phản tối thiểu 4.5:1; thành phần giao diện và focus cần ít nhất 3:1.
- Vùng bấm chính có chiều cao tối thiểu khoảng 44–48 px và có khoảng cách rõ ràng, đặc biệt cho học sinh dùng điện thoại.
- Không dùng màu làm tín hiệu duy nhất: trạng thái luôn có chữ, biểu tượng hoặc hình dạng đi kèm.

## Bảng màu

| Vai trò | Màu | Cách dùng |
|---|---|---|
| Forest 950 | `#071b16` | nền ứng dụng, giảm chói |
| Forest 800 | `#173c31` | nút chính, tiêu đề |
| Cream 100 | `#f3efdf` | bề mặt đọc lâu |
| Lime 300 | `#d7f37b` | hành động AI, tiến độ tích cực |
| Gold 300 | `#f7ce62` | PIN, focus, cảnh báo nhẹ |
| Rose | Tailwind rose | lỗi/xóa; không dùng trang trí |

## Typography và icon

- Font chính: Be Vietnam Pro, hỗ trợ đầy đủ dấu tiếng Việt.
- Lucide dùng cho hành động và điều hướng; emoji chỉ giữ trong phản hồi cảm xúc của màn chơi.
- Icon luôn đi cùng nhãn chữ ở hành động quan trọng. Nút chỉ có icon phải có `aria-label`.

## Nguồn tham khảo

- W3C, [Contrast Minimum](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- W3C, [Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
- Material Design, [Accessibility and touch targets](https://m1.material.io/usability/accessibility.html)
- Gnambs (2020), [Limited evidence for the effect of red color on cognitive performance](https://pubmed.ncbi.nlm.nih.gov/32696125/)
- Xia et al. (2016), [Exploring the Effect of Red and Blue on Cognitive Task Performances](https://pubmed.ncbi.nlm.nih.gov/27303343/)
- Liu et al. (2023), [Visual attention in mobile learning interface design](https://pmc.ncbi.nlm.nih.gov/articles/PMC10328315/)
