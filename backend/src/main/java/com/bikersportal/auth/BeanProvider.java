package com.bikersportal.auth;

import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

@Component
public class BeanProvider implements ApplicationContextAware {

    private static ApplicationContext context;

    @Override
    public void setApplicationContext(@NonNull ApplicationContext applicationContext) throws BeansException {
        BeanProvider.context = applicationContext;
    }

    public static <T> T getBean(Class<T> clazz) {
        if (context == null) return null;
        try {
            return context.getBean(clazz);
        } catch (Exception ex) {
            return null;
        }
    }
}
