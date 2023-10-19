package fi.mpass.voh.api.integration;

import org.springframework.data.domain.Sort;

public class PageableObject {
    Long offset;
    Sort sort;
    int pageNumber;
    int pageSize;
    boolean paged;
    boolean unpaged;

    public Long getOffset() {
        return offset;
    }
    public Sort getSort() {
        return sort;
    }
    public int getPageNumber() {
        return pageNumber;
    }
    public int getPageSize() {
        return pageSize;
    }
    public boolean isPaged() {
        return paged;
    }
    public boolean isUnpaged() {
        return unpaged;
    }
    public void setOffset(Long offset) {
        this.offset = offset;
    }
    public void setSort(Sort sort) {
        this.sort = sort;
    }
    public void setPageNumber(int pageNumber) {
        this.pageNumber = pageNumber;
    }
    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }
    public void setPaged(boolean paged) {
        this.paged = paged;
    }
    public void setUnpaged(boolean unpaged) {
        this.unpaged = unpaged;
    }
}
