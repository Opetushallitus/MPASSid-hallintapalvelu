package fi.mpass.voh.api.integration;

import java.util.List;

import org.springframework.data.domain.Sort;

public class PageIntegration {
    Long totalElements;
    int totalPages;
    int size;
    List<Integration> content;
    int number;
    Sort sort;
    PageableObject pageable;
    int numberOfElements;
    boolean first;
    boolean last;
    boolean empty;
    public Long getTotalElements() {
        return totalElements;
    }
    public int getTotalPages() {
        return totalPages;
    }
    public int getSize() {
        return size;
    }
    public List<Integration> getContent() {
        return content;
    }
    public int getNumber() {
        return number;
    }
    public Sort getSort() {
        return sort;
    }
    public PageableObject getPageable() {
        return pageable;
    }
    public int getNumberOfElements() {
        return numberOfElements;
    }
    public boolean isFirst() {
        return first;
    }
    public boolean isLast() {
        return last;
    }
    public boolean isEmpty() {
        return empty;
    }
    public void setTotalElements(Long totalElements) {
        this.totalElements = totalElements;
    }
    public void setTotalPages(int totalPages) {
        this.totalPages = totalPages;
    }
    public void setSize(int size) {
        this.size = size;
    }
    public void setContent(List<Integration> content) {
        this.content = content;
    }
    public void setNumber(int number) {
        this.number = number;
    }
    public void setSort(Sort sort) {
        this.sort = sort;
    }
    public void setPageable(PageableObject pageable) {
        this.pageable = pageable;
    }
    public void setNumberOfElements(int numberOfElements) {
        this.numberOfElements = numberOfElements;
    }
    public void setFirst(boolean first) {
        this.first = first;
    }
    public void setLast(boolean last) {
        this.last = last;
    }
    public void setEmpty(boolean empty) {
        this.empty = empty;
    }
}
