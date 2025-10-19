# Dockerfile for building a Clang toolchain on an Ubuntu 16.04 base
FROM ubuntu:16.04

# Set non-interactive frontend for apt-get
ENV DEBIAN_FRONTEND=noninteractive

# Install essential dependencies for building Python and CMake
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    git \
    libffi-dev \
    libgdbm-dev \
    libncurses5-dev \
    libreadline-dev \
    libsqlite3-dev \
    libssl-dev \
    ninja-build \
    wget \
    zlib1g-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set a working directory
WORKDIR /opt

# Build and install Python 3.8
RUN wget -q https://www.python.org/ftp/python/3.8.18/Python-3.8.18.tgz && \
    tar -xf Python-3.8.18.tgz && \
    cd Python-3.8.18 && \
    ./configure --enable-optimizations --prefix=/usr/local && \
    make -j$(nproc) && \
    make install && \
    cd /opt && \
    rm -rf Python-3.8.18.tgz Python-3.8.18

# Build and install CMake 3.28
RUN wget -q https://github.com/Kitware/CMake/releases/download/v3.28.3/cmake-3.28.3.tar.gz && \
    tar -xf cmake-3.28.3.tar.gz && \
    cd cmake-3.28.3 && \
    ./bootstrap --prefix=/usr/local && \
    make -j$(nproc) && \
    make install && \
    cd /opt && \
    rm -rf cmake-3.28.3.tar.gz cmake-3.28.3

# Set the default command to bash
CMD ["/bin/bash"]
